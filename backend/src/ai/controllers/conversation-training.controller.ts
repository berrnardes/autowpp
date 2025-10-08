import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    HttpCode,
    HttpStatus,
    Logger,
    ParseUUIDPipe,
    BadRequestException
} from '@nestjs/common';
import { ConversationTrainingService } from '../services/conversation-training.service';
import { AIService } from '../services/ai.service';
import {
    CreateConversationExampleDto,
    UpdateConversationExampleDto,
    ConversationExampleQueryDto,
    TrainModelDto,
    BulkCreateExamplesDto,
    ConversationExampleResponseDto,
    ConversationExamplesListResponseDto,
    TrainingResultResponseDto,
    TrainingDataStatsResponseDto
} from '../dto/conversation-example.dto';

@Controller('ai/training')
export class ConversationTrainingController {
    private readonly logger = new Logger(ConversationTrainingController.name);

    constructor(
        private readonly trainingService: ConversationTrainingService,
        private readonly aiService: AIService
    ) { }

    @Post('examples')
    @HttpCode(HttpStatus.CREATED)
    async createExample(
        @Body() createDto: CreateConversationExampleDto
    ): Promise<ConversationExampleResponseDto> {
        try {
            this.logger.log('Creating new conversation example');

            const example = await this.trainingService.createExample(createDto);

            return {
                id: example.id,
                customerMessage: example.customerMessage,
                desiredResponse: example.desiredResponse,
                category: example.category || undefined,
                createdAt: example.createdAt || new Date()
            };
        } catch (error) {
            this.logger.error('Error creating conversation example', error);
            throw error;
        }
    }

    @Get('examples')
    async getExamples(
        @Query() query: ConversationExampleQueryDto
    ): Promise<ConversationExamplesListResponseDto> {
        try {
            this.logger.debug(`Fetching conversation examples with query: ${JSON.stringify(query)}`);

            const { examples, total } = await this.trainingService.getExamples(query);
            const categories = await this.trainingService.getCategories();

            return {
                examples: examples.map(example => ({
                    id: example.id,
                    customerMessage: example.customerMessage,
                    desiredResponse: example.desiredResponse,
                    category: example.category || undefined,
                    createdAt: example.createdAt || new Date()
                })),
                total,
                limit: query.limit || 50,
                offset: query.offset || 0,
                categories
            };
        } catch (error) {
            this.logger.error('Error fetching conversation examples', error);
            throw error;
        }
    }

    @Get('examples/:id')
    async getExample(
        @Param('id', ParseUUIDPipe) id: string
    ): Promise<ConversationExampleResponseDto> {
        try {
            this.logger.debug(`Fetching conversation example: ${id}`);

            const example = await this.trainingService.getExampleById(id);
            if (!example) {
                throw new BadRequestException(`Exemplo de conversa com ID ${id} não encontrado`);
            }

            return {
                id: example.id,
                customerMessage: example.customerMessage,
                desiredResponse: example.desiredResponse,
                category: example.category || undefined,
                createdAt: example.createdAt || new Date()
            };
        } catch (error) {
            this.logger.error(`Error fetching conversation example ${id}`, error);
            throw error;
        }
    }

    @Put('examples/:id')
    async updateExample(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateDto: UpdateConversationExampleDto
    ): Promise<ConversationExampleResponseDto> {
        try {
            this.logger.log(`Updating conversation example: ${id}`);

            const example = await this.trainingService.updateExample(id, updateDto);

            return {
                id: example.id,
                customerMessage: example.customerMessage,
                desiredResponse: example.desiredResponse,
                category: example.category || undefined,
                createdAt: example.createdAt || new Date()
            };
        } catch (error) {
            this.logger.error(`Error updating conversation example ${id}`, error);
            throw error;
        }
    }

    @Delete('examples/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteExample(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        try {
            this.logger.log(`Deleting conversation example: ${id}`);
            await this.trainingService.deleteExample(id);
        } catch (error) {
            this.logger.error(`Error deleting conversation example ${id}`, error);
            throw error;
        }
    }

    @Get('categories')
    async getCategories(): Promise<string[]> {
        try {
            this.logger.debug('Fetching conversation categories');
            return await this.trainingService.getCategories();
        } catch (error) {
            this.logger.error('Error fetching categories', error);
            throw error;
        }
    }

    @Post('train')
    @HttpCode(HttpStatus.OK)
    async trainModel(@Body() trainDto: TrainModelDto): Promise<TrainingResultResponseDto> {
        try {
            this.logger.log(`Starting model training with type: ${trainDto.trainingType}`);

            if (trainDto.trainingType === 'validation') {
                const validationResult = await this.trainingService.validateTrainingData();
                const stats = await this.getTrainingStats();

                return {
                    success: validationResult.success,
                    message: validationResult.message,
                    examplesProcessed: validationResult.examplesProcessed,
                    trainingType: 'validation',
                    categories: stats.categories,
                    validationResults: {
                        totalExamples: stats.totalExamples,
                        validExamples: stats.validExamples,
                        averageMessageLength: stats.averageMessageLength,
                        averageResponseLength: stats.averageResponseLength
                    }
                };
            }

            // Get training examples for few-shot learning
            const examples = await this.trainingService.getTrainingExamplesForFewShot(
                trainDto.category,
                trainDto.maxExamples
            );

            if (examples.length === 0) {
                return {
                    success: false,
                    message: trainDto.category
                        ? `Nenhum exemplo encontrado para a categoria "${trainDto.category}"`
                        : 'Nenhum exemplo de treinamento encontrado',
                    examplesProcessed: 0,
                    trainingType: 'few_shot'
                };
            }

            // Convert examples to the format expected by AI service
            const aiExamples = examples.map(ex => ({
                customerMessage: ex.customerMessage,
                desiredResponse: ex.desiredResponse,
                category: ex.category || undefined
            }));

            // Train the AI model with examples
            const trainingResult = await this.aiService.trainModel(aiExamples);
            const categories = await this.trainingService.getCategories();

            return {
                success: trainingResult.success,
                message: trainingResult.message,
                examplesProcessed: trainingResult.examplesProcessed,
                trainingType: 'few_shot',
                categories
            };

        } catch (error) {
            this.logger.error('Error training model', error);
            return {
                success: false,
                message: `Erro durante o treinamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
                examplesProcessed: 0,
                trainingType: trainDto.trainingType
            };
        }
    }

    @Get('stats')
    async getTrainingStats(): Promise<TrainingDataStatsResponseDto> {
        try {
            this.logger.debug('Fetching training data statistics');

            const { processedExamples, categories, totalExamples, validExamples } =
                await this.trainingService.processTrainingData();

            const averageMessageLength = processedExamples.length > 0
                ? processedExamples.reduce((sum, ex) => sum + ex.messageLength, 0) / processedExamples.length
                : 0;

            const averageResponseLength = processedExamples.length > 0
                ? processedExamples.reduce((sum, ex) => sum + ex.responseLength, 0) / processedExamples.length
                : 0;

            const examplesByCategory: Record<string, number> = {};
            processedExamples.forEach(example => {
                const category = example.category || 'Sem categoria';
                examplesByCategory[category] = (examplesByCategory[category] || 0) + 1;
            });

            const recentExamples = processedExamples
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                .slice(0, 5)
                .map(example => ({
                    id: example.id,
                    customerMessage: example.customerMessage,
                    desiredResponse: example.desiredResponse,
                    category: example.category || undefined,
                    createdAt: example.createdAt || new Date()
                }));

            return {
                totalExamples,
                validExamples,
                categories,
                averageMessageLength: Math.round(averageMessageLength),
                averageResponseLength: Math.round(averageResponseLength),
                examplesByCategory,
                recentExamples
            };

        } catch (error) {
            this.logger.error('Error fetching training statistics', error);
            throw error;
        }
    }

    @Post('examples/bulk')
    @HttpCode(HttpStatus.CREATED)
    async bulkCreateExamples(
        @Body() bulkDto: BulkCreateExamplesDto
    ): Promise<{ created: number; errors: string[] }> {
        try {
            this.logger.log(`Bulk creating examples from ${bulkDto.format} data`);

            const results: { created: number; errors: string[] } = { created: 0, errors: [] };

            if (bulkDto.format === 'csv') {
                const lines = bulkDto.data.split('\n').filter(line => line.trim());

                // Skip header if present
                const dataLines = lines[0].includes('customerMessage') || lines[0].includes('mensagem')
                    ? lines.slice(1)
                    : lines;

                for (const [index, line] of dataLines.entries()) {
                    try {
                        const [customerMessage, desiredResponse, category] = line.split(',').map(s => s.trim().replace(/"/g, ''));

                        if (customerMessage && desiredResponse) {
                            await this.trainingService.createExample({
                                customerMessage,
                                desiredResponse,
                                category: category || bulkDto.defaultCategory
                            });
                            results.created++;
                        } else {
                            results.errors.push(`Linha ${index + 2}: Mensagem do cliente e resposta são obrigatórias`);
                        }
                    } catch (error) {
                        results.errors.push(`Linha ${index + 2}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
                    }
                }
            } else if (bulkDto.format === 'json') {
                try {
                    const examples = JSON.parse(bulkDto.data);

                    if (!Array.isArray(examples)) {
                        throw new BadRequestException('Dados JSON devem ser um array de exemplos');
                    }

                    for (const [index, example] of examples.entries()) {
                        try {
                            await this.trainingService.createExample({
                                customerMessage: example.customerMessage || example.mensagem,
                                desiredResponse: example.desiredResponse || example.resposta,
                                category: example.category || example.categoria || bulkDto.defaultCategory
                            });
                            results.created++;
                        } catch (error) {
                            results.errors.push(`Exemplo ${index + 1}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
                        }
                    }
                } catch (parseError) {
                    if (parseError instanceof BadRequestException) {
                        throw parseError;
                    }
                    throw new BadRequestException('Formato JSON inválido');
                }
            }

            this.logger.log(`Bulk creation completed: ${results.created} created, ${results.errors.length} errors`);
            return results;

        } catch (error) {
            this.logger.error('Error in bulk create examples', error);
            throw error;
        }
    }

    @Post('validate')
    @HttpCode(HttpStatus.OK)
    async validateTrainingData(): Promise<TrainingResultResponseDto> {
        try {
            this.logger.log('Validating training data');

            const validationResult = await this.trainingService.validateTrainingData();
            const categories = await this.trainingService.getCategories();

            return {
                success: validationResult.success,
                message: validationResult.message,
                examplesProcessed: validationResult.examplesProcessed,
                trainingType: 'validation',
                categories
            };

        } catch (error) {
            this.logger.error('Error validating training data', error);
            throw error;
        }
    }
}
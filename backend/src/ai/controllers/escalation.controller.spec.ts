import { Test, TestingModule } from '@nestjs/testing';
import { EscalationController } from './escalation.controller';
import { EscalationService } from '../services/escalation.service';
import { ConfidenceScoringService } from '../services/confidence-scoring.service';

describe('EscalationController', () => {
  let controller: EscalationController;

  beforeEach(async () => {
    const mockEscalationService = {
      getEscalationRules: jest.fn().mockReturnValue([]),
      addEscalationRule: jest.fn(),
      removeEscalationRule: jest.fn(),
      getManualReviewQueue: jest.fn().mockReturnValue({ items: [], total: 0 }),
      updateManualReviewItem: jest.fn(),
      escalateConversation: jest.fn(),
      getConversationEscalationEvents: jest.fn().mockReturnValue([]),
      resolveEscalationEvent: jest.fn(),
      getEscalationMetrics: jest.fn().mockReturnValue({})
    };

    const mockConfidenceScoringService = {
      getConfidenceThreshold: jest.fn().mockReturnValue(0.75),
      updateConfidenceThreshold: jest.fn(),
      getConfidenceStatistics: jest.fn().mockReturnValue({})
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EscalationController],
      providers: [
        { provide: EscalationService, useValue: mockEscalationService },
        { provide: ConfidenceScoringService, useValue: mockConfidenceScoringService }
      ],
    }).compile();

    controller = module.get<EscalationController>(EscalationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get escalation rules', () => {
    const result = controller.getEscalationRules();
    expect(result).toEqual([]);
  });

  it('should get manual review queue', () => {
    const result = controller.getManualReviewQueue();
    expect(result).toEqual({ items: [], total: 0 });
  });

  it('should get confidence thresholds', () => {
    const result = controller.getConfidenceThresholds();
    expect(result).toBeDefined();
  });
});
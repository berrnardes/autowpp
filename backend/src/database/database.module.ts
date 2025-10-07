import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { DatabaseHealthCheck } from './health-check';

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';

@Global()
@Module({
  providers: [
    DatabaseService,
    DatabaseHealthCheck
  ],
  exports: [
    DatabaseService,
    DatabaseHealthCheck
  ],
})
export class DatabaseModule {}

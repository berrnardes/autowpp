import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from './database.service';
import { DatabaseHealthCheck } from './health-check';
import { ConfigModule } from '@nestjs/config';

describe('DatabaseService', () => {
  let service: DatabaseService;
  let healthCheck: DatabaseHealthCheck;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [DatabaseService, DatabaseHealthCheck],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
    healthCheck = module.get<DatabaseHealthCheck>(DatabaseHealthCheck);
  });

  afterEach(async () => {
    await service.closeConnection();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(healthCheck).toBeDefined();
  });

  it('should connect to database', async () => {
    const isConnected = await service.checkConnection();
    expect(isConnected).toBe(true);
  });

  it('should get database instance', () => {
    const db = service.getDatabase();
    expect(db).toBeDefined();
  });

  it('should get connection pool', () => {
    const pool = service.getConnection();
    expect(pool).toBeDefined();
  });

  it('should check database health', async () => {
    const health = await healthCheck.checkHealth();
    expect(health).toBeDefined();
    expect(health.isHealthy).toBe(true);
    expect(health.connectionStatus).toBe('connected');
    expect(health.tableStats).toBeDefined();
  });

  it('should validate schema', async () => {
    const validation = await healthCheck.validateSchema();
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should get database statistics', async () => {
    const stats = await service.getDatabaseStats();
    expect(stats).toBeDefined();
    expect(typeof stats.totalConnections).toBe('number');
    expect(typeof stats.idleConnections).toBe('number');
    expect(typeof stats.waitingCount).toBe('number');
  });

  it('should test database performance', async () => {
    const performance = await service.testPerformance();
    expect(performance).toBeDefined();
    expect(typeof performance.queryTime).toBe('number');
    expect(typeof performance.connectionTime).toBe('number');
    expect(performance.queryTime).toBeGreaterThan(0);
    expect(performance.connectionTime).toBeGreaterThan(0);
  });
});
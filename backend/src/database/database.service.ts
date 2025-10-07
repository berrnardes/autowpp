import { Injectable } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { db, pool } from './connection';

@Injectable()
export class DatabaseService {
  private database: ReturnType<typeof drizzle>;

  constructor() {
    this.database = db;
  }

  getDatabase() {
    return this.database;
  }

  getConnection(): Pool {
    return pool;
  }
}
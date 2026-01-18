import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let pool;

export async function initPool() {
  if (pool) return pool;
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gopya',
    connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
    waitForConnections: true,
  });
  return pool;
}

export function getPool() {
  if (!pool) {
    throw new Error('Pool not initialized. Call initPool() first.');
  }
  return pool;
}


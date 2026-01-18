import { getPool } from '../db/pool.js';

export async function cleanupExpired() {
  const pool = getPool();
  const sql =
    'DELETE FROM secrets WHERE (expires_at <= NOW()) OR (read_at IS NOT NULL)';
  const [result] = await pool.execute(sql);
  return result?.affectedRows || 0;
}

// Example manual runner
// cleanupExpired().then((count) => console.log(`Deleted ${count} expired secrets`));


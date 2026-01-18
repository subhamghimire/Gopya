import dotenv from 'dotenv';
import app from './app.js';
import { initPool } from './db/pool.js';

dotenv.config();

const PORT = process.env.PORT || 3000;

async function start() {
  await initPool();
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});


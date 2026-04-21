import Redis from 'ioredis';
import { Queue } from 'bullmq';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let redisConnection: Redis | null = null;

export function getRedis(): Redis {
  if (!redisConnection) {
    redisConnection = new Redis(redisUrl, {
      maxRetriesPerRequest: null, // required by BullMQ
      retryStrategy(times) {
        if (times > 10) return null; // stop retrying
        return Math.min(times * 200, 3000);
      },
    });
    redisConnection.on('error', (err) => {
      console.warn('[Redis] Connection error (BullMQ queue will be unavailable):', err.message);
    });
  }
  return redisConnection;
}

let mintQueue: Queue | null = null;

export function getMintQueue(): Queue {
  if (!mintQueue) {
    mintQueue = new Queue('mint-queue', { connection: getRedis() });
  }
  return mintQueue;
}

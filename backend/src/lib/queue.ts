import Redis from 'ioredis';
import { Queue } from 'bullmq';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
let redisAvailable = true;
let redisConnection: Redis | null = null;
let errorLogged = false;

export function getRedis(): Redis {
  if (!redisConnection) {
    redisConnection = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: true, // don't connect until first command
      retryStrategy(times) {
        if (times > 3) {
          redisAvailable = false;
          if (!errorLogged) {
            console.warn('[Redis] Unavailable after 3 retries — BullMQ queue disabled');
            errorLogged = true;
          }
          return null; // stop retrying
        }
        return Math.min(times * 500, 2000);
      },
    });
    redisConnection.on('error', () => {
      // Suppress repeated error logs
      if (!errorLogged) {
        console.warn('[Redis] Connection failed — minting queue will be unavailable');
        errorLogged = true;
      }
    });
  }
  return redisConnection;
}

let mintQueue: Queue | null = null;

export function getMintQueue(): Queue | null {
  if (!redisAvailable) return null;
  if (!mintQueue) {
    try {
      mintQueue = new Queue('mint-queue', { connection: getRedis() });
    } catch {
      return null;
    }
  }
  return mintQueue;
}

export function isRedisAvailable(): boolean {
  return redisAvailable;
}

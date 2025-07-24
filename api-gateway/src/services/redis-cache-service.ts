import { RedisClientType } from "redis";
import logger from "../config/logger.js";
import { getFormattedErrorMessage } from "../lib/error.js";

const createRedisCacheService = (redisClient: RedisClientType) => {
  return {
    get: async <T>(key: string): Promise<T | null> => {
      try {
        const value = await redisClient.get(key);
        if (value) {
          return JSON.parse(value) as T;
        }
        return null;
      } catch (error) {
        logger.error(getFormattedErrorMessage(error, `RedisCache: Error getting key ${key}`));
        return null;
      }
    },
    set: async <T>(key: string, value: T, ttlSeconds?: number): Promise<void> => {
      try {
        const stringValue = JSON.stringify(value);

        if (ttlSeconds) {
          await redisClient.setEx(key, ttlSeconds, stringValue);
        } else {
          await redisClient.set(key, stringValue);
        }
      } catch (error) {
        logger.error(getFormattedErrorMessage(error, `RedisCache: Error setting key ${key}`));
      }
    },
    hGet: async (key: string, field: string): Promise<string | null> => {
      try {
        const value = await redisClient.hGet(key, field);
        if (value) {
          return value;
        }

        return null;
      } catch (error) {
        logger.error(getFormattedErrorMessage(error, `RedisCache: Error hGetting field ${field} from key ${key}`));
        return null;
      }
    },
    hSet: async <T extends Record<string, unknown>>(key: string, data: T, ttlSeconds?: number): Promise<void> => {
      try {
        const stringifiedData: { [field: string]: string } = {};

        for (const [k, v] of Object.entries(data)) {
          stringifiedData[k] = String(v);
        }

        const multi = redisClient.multi().hSet(key, stringifiedData);
        if (ttlSeconds) {
          multi.expire(key, ttlSeconds);
        }

        await multi.exec();
      } catch (error) {
        logger.error(getFormattedErrorMessage(error, `RedisCache: Error hSetting key ${key}`));
      }
    },
    del: async (key: string): Promise<void> => {
      try {
        await redisClient.del(key);
      } catch (error) {
        logger.error(getFormattedErrorMessage(error, `RedisCache: Error deleting key ${key}`));
      }
    },
  };
};

export type RedisCacheService = ReturnType<typeof createRedisCacheService>;
export default createRedisCacheService;

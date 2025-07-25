import { RedisClientType } from "redis";
import logger from "./config/logger.js";
import { getFormattedErrorMessage } from "./lib/error.js";

const createRedisCacheService = (redisClient: RedisClientType) => {
  return {
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
  };
};

export type RedisCacheService = ReturnType<typeof createRedisCacheService>;
export default createRedisCacheService;

import { createClient, RedisClientType } from "redis";
import logger from "./logger.js";
import { getFormattedErrorMessage } from "../lib/error.js";
import env from "./env.js";

let redisClient: RedisClientType | null = null;

async function testClientResponsiveness(client: RedisClientType): Promise<void> {
  try {
    const pong = await client.ping();

    if (pong !== "PONG") {
      throw new Error("Redis: Client returned an unexpected response to PING.");
    }

    logger.info("Redis: Client is responsive and healthy.");
  } catch (error) {
    logger.error(getFormattedErrorMessage(error, "Redis client responsiveness check failed."));
    throw new Error(`Redis: Client responsiveness check failed.`);
  }
}

async function connectToRedis(): Promise<void> {
  logger.info("Redis: Attempting to connect to the client...");

  if (redisClient) {
    logger.warn("Redis: Client already initialized.");
    try {
      await testClientResponsiveness(redisClient);
      return;
    } catch (existingClientError) {
      logger.warn("Redis: Existing client is not responsive. Attempting to re-initialize.");
      if (redisClient.isOpen) {
        try {
          await redisClient.quit();
          logger.info("Redis: Closed non-responsive existing client.");
        } catch (error) {
          logger.error(getFormattedErrorMessage(error, "Redis: Error closing non-responsive existing client."));
        }
      }
      redisClient = null;
    }
  }

  try {
    logger.info("Redis: Initializing new client connection...");

    const newClient = createClient({
      url: `redis://${env.REDIS_HOST}:${env.REDIS_PORT}`,
      database: parseInt(env.REDIS_DATABASE, 10),
      password: env.REDIS_PASSWORD,
    });

    newClient.on("error", (error) => {
      logger.error(getFormattedErrorMessage(error, "Redis Client: Error. Closing application immediately"));
      process.exit(1);
    });

    newClient.on("end", () => {
      logger.error("Redis Client: Disconnected. Closing application immediately.");
      process.exit(1);
    });

    newClient.on("connect", () => logger.info("Redis Client: Connecting..."));
    newClient.on("ready", () => logger.info("Redis Client: Connected and Ready!"));
    newClient.on("reconnecting", () => logger.info("Redis Client: Reconnecting..."));

    await newClient.connect();
    redisClient = newClient as RedisClientType;
    await testClientResponsiveness(redisClient);
    logger.info("Redis: Client initialized and connected successfully.");
  } catch (error) {
    logger.error(getFormattedErrorMessage(error, `Redis: Failed to initialize or connect`));
    if (redisClient && redisClient.isOpen) {
      try {
        await redisClient.quit();
      } catch (err: any) {
        logger.error(`Redis: Error cleaning up partially connected client: ${err.message}`);
      }
    }
    redisClient = null;
    throw new Error(`Redis: Failed to connect to client during initialization.`);
  }
}

function getRedisClient(): RedisClientType {
  if (!redisClient || !redisClient.isReady) {
    throw new Error("Redis: Client has not been initialized or is not ready. Call connectToRedis() first.");
  }

  return redisClient;
}

async function closeRedisClient(): Promise<void> {
  if (!redisClient) {
    logger.warn("Redis: Attempted to close client, but it was not initialized.");
    return;
  }
  try {
    await redisClient.quit();
    logger.info("Redis: Client closed successfully.");
  } catch (error) {
    logger.error(getFormattedErrorMessage(error, "Failed to close Redis client"));
    throw new Error(`Redis: Failed to close Redis client.`);
  } finally {
    redisClient = null;
  }
}

export { connectToRedis, getRedisClient, closeRedisClient };

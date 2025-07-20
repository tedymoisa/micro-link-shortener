import { Pool, PoolClient, QueryResult } from "pg";
import env from "./env.js";
import logger from "./logger.js";
import { getFormattedErrorMessage } from "../lib/error.js";

const dbConfig = {
  user: env.DB_USER,
  host: env.DB_HOST,
  database: env.DB_DATABASE,
  password: env.DB_PASSWORD,
  port: Number(env.DB_PORT),
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20,
};

let pgPool: Pool;

async function connectToDb(): Promise<void> {
  logger.info("Attempting to connect to PostgreSQL...");

  if (pgPool) {
    logger.warn("Database pool already initialized.");

    return testPoolResponsiveness(pgPool);
  }

  try {
    logger.info("Initializing database connection pool...");
    pgPool = new Pool(dbConfig);

    await testPoolResponsiveness(pgPool);
    logger.info("Database pool initialized and connected successfully.");
  } catch (error) {
    logger.error(getFormattedErrorMessage(error, `Failed to initialize or connect to database.`));

    if (pgPool) {
      await pgPool.end().catch((err) => logger.error("Error closing partially initialized pool:", err.message));
    }

    throw new Error(`Failed to connect to database during initialization.`);
  }
}

async function testPoolResponsiveness(pool: Pool): Promise<void> {
  let client: PoolClient | undefined;
  try {
    client = await pool.connect();

    const result: QueryResult = await client.query("SELECT 1 + 1 AS solution;");
    if (result.rows[0].solution !== 2) {
      throw new Error("Database returned an unexpected response to a simple query.");
    }

    logger.info("Database is responsive and healthy.");
  } catch (error) {
    logger.error(getFormattedErrorMessage(error, "Database connection or responsiveness check failed."));
    throw new Error(`Database connection or responsiveness check failed.`);
  } finally {
    if (client) {
      client.release();
    }
  }
}

function getDbPool(): Pool {
  if (!pgPool) {
    throw new Error("Database pool has not been initialized. Call connectToDb() first.");
  }

  return pgPool;
}

async function closeDbPool(): Promise<void> {
  if (!pgPool) {
    logger.warn("Attempted to close DB pool, but it was not initialized.");
    return;
  }

  try {
    logger.info("Closing database connection pool...");
    await pgPool.end();
    logger.info("Database pool closed successfully.");
  } catch (error) {
    logger.error(getFormattedErrorMessage(error, `Failed to close database pool.`));
    throw new Error(`Error during database pool shutdown.`);
  }
}

export { connectToDb, getDbPool, closeDbPool };

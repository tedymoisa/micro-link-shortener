import env from "./config/env.js";
import logger from "./config/logger.js";

import express from "express";
import pinoHttp from "pino-http";
import { connectToDb, getDbPool } from "./config/db.js";
import { connectRabbitMQ } from "./config/rabbitmq.js";
import shutdown from "./config/shutdown.js";
import createUrlController from "./controllers/url-controller/url-controller.js";
import { getFormattedErrorMessage } from "./lib/error.js";
import createUrlRepository from "./repositories/url-repository.js";
import createMainRouter from "./routes/index.js";
import createUrlRouter from "./routes/url-routes.js";
import createUrlService from "./services/url-service.js";
import { connectToRedis, getRedisClient } from "./config/redis.js";

const port = env.PORT;

const app = express();

app.use(express.json());

async function startApplication() {
  try {
    await connectToDb();
    await connectToRedis();
    connectRabbitMQ();

    const pgPool = getDbPool();
    const redisClient = getRedisClient();
    const urlRepository = createUrlRepository(pgPool, redisClient);
    const urlService = createUrlService(urlRepository);
    const urlController = createUrlController(urlService);

    const urlRouter = createUrlRouter(urlController);
    const mainRouter = createMainRouter(urlRouter);

    app.use(pinoHttp.default({ logger }));
    app.use("/", mainRouter);

    app.listen(port, () => {
      logger.info(`Server running on http://localhost:${port}`);
    });

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    logger.error(getFormattedErrorMessage(error, "Application failed to start."));
    process.exit(1);
  }
}

startApplication();

import env from "./config/env.js";
import logger from "./config/logger.js";

import express from "express";
import pinoHttp from "pino-http";
import { closeRabbitMQ, connectRabbitMQ, getRabbitMQChannel } from "./config/rabbitmq.js";
import { RABBIT_MQ_QUEUES } from "./lib/globals.js";
import { closeDbPool, connectToDb, getDbPool } from "./config/db.js";
import createUrlRepository from "./repositories/url-repository.js";
import createUrlService from "./services/url-service.js";
import createUrlController from "./controllers/url-controller/url-controller.js";
import createUrlRouter from "./routes/url-routes.js";
import createMainRouter from "./routes/index.js";
import { getFormattedErrorMessage } from "./lib/error.js";
import shutdown from "./config/shutdown.js";

const port = env.PORT;

const app = express();

app.use(express.json());

async function startApplication() {
  try {
    await connectToDb();
    connectRabbitMQ();

    const setupConsumers = async () => {
      const channel = getRabbitMQChannel();

      if (channel) {
        await channel.assertQueue(RABBIT_MQ_QUEUES.QR_SERVICE_QUEUE, { durable: true });
        logger.info(`RabbitMQ: Queue '${RABBIT_MQ_QUEUES.QR_SERVICE_QUEUE}' asserted.`);
      } else {
        setTimeout(setupConsumers, 5000);
      }
    };
    setupConsumers();

    const pgPool = getDbPool();
    const urlRepository = createUrlRepository(pgPool);
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

import { connectToDb, getDbPool } from "./config/db.js";
import "./config/env.js";
import logger from "./config/logger.js";
import { connectRabbitMQ, startConsumingQueue } from "./config/rabbitmq.js";
import shutdown from "./config/shutdown.js";
import { getFormattedErrorMessage } from "./lib/error.js";
import { RABBIT_MQ_QUEUES } from "./lib/globals.js";
import { createUrlRepository } from "./url-repository.js";
import createUrlService from "./url-service.js";

async function startWorkerApplication() {
  try {
    await connectToDb();
    await connectRabbitMQ();

    const pgPool = getDbPool();
    const urlRepository = createUrlRepository(pgPool);
    const urlService = createUrlService(urlRepository);

    await startConsumingQueue(RABBIT_MQ_QUEUES.QR_SERVICE_QUEUE, urlService.generateQRCode);

    logger.info(`Worker: Listening for tasks on queue ${RABBIT_MQ_QUEUES.QR_SERVICE_QUEUE}`);
  } catch (error) {
    logger.error(getFormattedErrorMessage(error, `Worker: Application failed to start.`));
    process.exit(1);
  }
}

startWorkerApplication();

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

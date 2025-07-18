import { connectToDb, getDbPool } from "./config/db.js";
import "./config/env.js";
import logger from "./config/logger.js";
import { closeRabbitMQ, connectRabbitMQ, startConsumingQueue } from "./config/rabbitmq.js";
import { getFormattedErrorMessage } from "./lib/error.js";
import { RABBIT_MQ_QUEUES } from "./lib/globals.js";
import { createUrlRepository } from "./url-repository.js";
import { createUrlService } from "./url-service.js";

async function startWorkerApplication() {
  try {
    await connectRabbitMQ();
    await connectToDb();

    const pgPool = getDbPool();
    const urlRepository = createUrlRepository(pgPool);
    const urlService = createUrlService(urlRepository);

    await startConsumingQueue(RABBIT_MQ_QUEUES.QR_SERVICE_QUEUE, urlService.generateQRCode);

    logger.info(`Worker is listening for tasks on queue: "${RABBIT_MQ_QUEUES.QR_SERVICE_QUEUE}"...`);
  } catch (error) {
    logger.error(getFormattedErrorMessage(`Worker application failed to start.`, error));
    process.exit(1);
  }
}

startWorkerApplication();

process.on("SIGINT", async () => {
  logger.info("Worker: SIGINT received, gracefully shutting down...");
  await closeRabbitMQ();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Worker: SIGTERM received, gracefully shutting down...");
  await closeRabbitMQ();
  process.exit(0);
});

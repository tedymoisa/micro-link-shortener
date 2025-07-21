import { getFormattedErrorMessage } from "../lib/error.js";
import { closeDbPool } from "./db.js";
import logger from "./logger.js";
import { closeRabbitMQ } from "./rabbitmq.js";

let isShuttingDown = false;

const shutdown = async () => {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  logger.info("Initiating graceful shutdown...");

  try {
    await closeDbPool();
    await closeRabbitMQ();

    logger.info("All connections closed. Exiting application.");
    process.exit(0);
  } catch (error) {
    logger.error(getFormattedErrorMessage(error, "Error during graceful shutdown."));
    process.exit(1);
  }
};

export default shutdown;

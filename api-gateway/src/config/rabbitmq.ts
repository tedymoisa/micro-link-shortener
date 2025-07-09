import amqp, { Channel, ChannelModel } from "amqplib";
import logger from "./logger.js";
import env from "./env.js";

let _connection: ChannelModel | null = null;
let _channel: Channel | null = null;
let _reconnectTimer: NodeJS.Timeout | null = null;

const AMQP_URL = `amqp://${env.RABBIT_MQ_USER}:${env.RABBIT_MQ_PASSWORD}@${env.RABBIT_MQ_HOST}:${env.RABBIT_MQ_PORT}`;
const INITIAL_MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 2000;
const PERSISTENT_RECONNECT_INTERVAL_MS = 10000;

async function attemptRabbitMQConnection(): Promise<void> {
  if (_connection && _channel) {
    logger.info("RabbitMQ connection already established. Skipping new attempt.");
    return;
  }

  try {
    logger.info("Attempting to establish new RabbitMQ connection...");
    const connection = await amqp.connect(AMQP_URL);
    const channel = await connection.createChannel();

    if (_reconnectTimer) {
      clearInterval(_reconnectTimer);
      _reconnectTimer = null;
      logger.info("RabbitMQ reconnected, clearing persistent retry timer.");
    }

    _connection = connection;
    _channel = channel;

    _connection.on("close", (error: unknown) => {
      if (error) {
        logger.error("RabbitMQ connection closed with error:", error);
      } else {
        logger.warn("RabbitMQ connection closed gracefully.");
      }
      _channel = null;
      _connection = null;

      startPersistentRabbitMQReconnect();
    });

    _connection.on("error", (error: unknown) => {
      logger.error("RabbitMQ connection error:", error);
    });

    logger.info("Successfully connected to RabbitMQ!");
  } catch (error) {
    logger.error(`Failed to establish RabbitMQ connection!`);
    _channel = null;
    _connection = null;
    throw error;
  }
}

export async function connectRabbitMQ() {
  if (_channel && _connection) {
    logger.info("RabbitMQ already connected!");
    return _channel;
  }

  if (_reconnectTimer) {
    clearInterval(_reconnectTimer);
    _reconnectTimer = null;
  }

  for (let i = 0; i < INITIAL_MAX_RETRIES; i++) {
    try {
      await attemptRabbitMQConnection();
      if (_channel) {
        return _channel;
      }
    } catch (error) {
      logger.warn(`Initial RabbitMQ connection attempt ${i + 1}/${INITIAL_MAX_RETRIES} failed.`);
      if (i < INITIAL_MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, INITIAL_RETRY_DELAY_MS * (i + 1)));
      }
    }
  }

  logger.error(`Failed to connect to RabbitMQ after ${INITIAL_MAX_RETRIES} initial attempts.`);

  startPersistentRabbitMQReconnect();

  throw new Error("RabbitMQ connection could not be established at startup.");
}

function startPersistentRabbitMQReconnect(): void {
  if (_reconnectTimer) {
    return;
  }

  logger.info(
    `Starting persistent RabbitMQ re-connection attempts every ${PERSISTENT_RECONNECT_INTERVAL_MS / 1000} seconds...`,
  );

  _reconnectTimer = setInterval(async () => {
    if (_connection && _channel) {
      logger.info("RabbitMQ reconnected via persistent check, stopping timer.");
      clearInterval(_reconnectTimer!);
      _reconnectTimer = null;
      return;
    }

    try {
      await attemptRabbitMQConnection();
    } catch (error) {
      logger.warn(`Persistent RabbitMQ re-connection attempt failed.`);
    }
  }, PERSISTENT_RECONNECT_INTERVAL_MS);
}

export function getRabbitMQChannel() {
  if (!_channel) {
    logger.warn("RabbitMQ channel not available.");
  }

  return _channel;
}

export async function closeRabbitMQ() {
  if (_reconnectTimer) {
    clearInterval(_reconnectTimer);
    _reconnectTimer = null;
    logger.info("Cleared RabbitMQ persistent reconnect timer.");
  }

  if (_channel) {
    try {
      await _channel.close();
      logger.info("RabbitMQ channel closed.");
    } catch (error) {
      logger.error("Error closing RabbitMQ channel.");
    } finally {
      _channel = null;
    }
  }

  if (_connection) {
    try {
      await _connection.close();
      logger.info("RabbitMQ connection closed.");
    } catch (error) {
      logger.error("Error closing RabbitMQ connection.");
    } finally {
      _connection = null;
    }
  }
}

export async function sendMessage(queue: string, message: string) {
  const channel = getRabbitMQChannel();

  if (channel) {
    try {
      await channel.assertQueue(queue, { durable: true });
      const published = channel.sendToQueue(queue, Buffer.from(message), { persistent: true });

      if (!published) {
        logger.warn(`RabbitMQ channel buffer is full, message for "${queue}" might be delayed.`);
      }

      logger.info(`Sent message "${message}" to queue "${queue}".`);
    } catch (error) {
      logger.error(`Failed to send message to queue "${queue}".`);
    }
  } else {
    logger.warn(`Cannot send message "${message}": RabbitMQ channel not available.`);
  }
}

export async function publishMessage(exhange: string, queue: string | undefined, message: string) {
  const channel = getRabbitMQChannel();

  if (channel) {
    try {
      const published = channel.publish(exhange, queue ?? "", Buffer.from(message), { persistent: true });

      if (!published) {
        logger.warn(`RabbitMQ channel buffer is full, message for "${queue}" from "${exhange}" might be delayed.`);
      }

      logger.info(`Sent message "${message}" to queue "${queue}" from "${exhange}".`);
    } catch (error) {
      logger.error(`Failed to send message to "${queue}".`);
    }
  } else {
    logger.warn(`Cannot send message "${message}": RabbitMQ channel not available.`);
  }
}

import amqp, { Channel, ChannelModel } from "amqplib";
import { getFormattedErrorMessage } from "../lib/error.js";
import env from "./env.js";
import logger from "./logger.js";

let _connection: ChannelModel | null = null;
let _channel: Channel | null = null;
let _reconnectTimer: NodeJS.Timeout | null = null;
let _initialConnectAttempts: number = 0;

const AMQP_URL = `amqp://${env.RABBIT_MQ_USER}:${env.RABBIT_MQ_PASSWORD}@${env.RABBIT_MQ_HOST}:${env.RABBIT_MQ_PORT}`;
const INITIAL_MAX_ATTEMPTS = 5;
const INITIAL_RETRY_DELAY_MS = 2000;

const PERSISTENT_RECONNECT_INTERVAL_MS = 10000;

async function _attemptSingleConnection(): Promise<void> {
  if (_connection && _channel) {
    logger.debug("RabbitMQ: Connection already active. Skipping connection attempt.");
    return;
  }

  try {
    const connection = await amqp.connect(AMQP_URL);
    const channel = await connection.createChannel();

    if (_reconnectTimer) {
      clearInterval(_reconnectTimer);
      _reconnectTimer = null;
    }
    _initialConnectAttempts = 0;

    _connection = connection;
    _channel = channel;

    _connection.on("close", (error) => {
      _channel = null;
      _connection = null;

      if (error) {
        logger.error(getFormattedErrorMessage(error, "RabbitMQ: Connection closed with error"));

        startPersistentRabbitMQReconnect();
      } else {
        logger.info("RabbitMQ: Connection closed gracefully.");
      }
    });

    _connection.on("error", (error) => {
      logger.error(getFormattedErrorMessage(error, "RabbitMQ: Connection error"));
    });

    logger.info("RabbitMQ: Successfully established a connection and channel.");
  } catch (error) {
    _channel = null;
    _connection = null;
    throw new Error(getFormattedErrorMessage(error, "RabbitMQ: Failed to establish connection attempt"));
  }
}

export async function connectRabbitMQ(): Promise<void> {
  logger.info("RabbitMQ: Starting connection sequence...");

  if (_channel && _connection) {
    logger.info("RabbitMQ: Already connected.");
    return;
  }

  if (_reconnectTimer) {
    clearInterval(_reconnectTimer);
    _reconnectTimer = null;
  }

  _initialConnectAttempts = 0;
  while (_initialConnectAttempts < INITIAL_MAX_ATTEMPTS) {
    _initialConnectAttempts++;

    try {
      logger.info(`RabbitMQ: Initial connection attempt ${_initialConnectAttempts}/${INITIAL_MAX_ATTEMPTS}...`);
      await _attemptSingleConnection();
      return;
    } catch (error) {
      logger.warn(getFormattedErrorMessage(error, `RabbitMQ: Initial attempt ${_initialConnectAttempts}`));
      if (_initialConnectAttempts < INITIAL_MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, INITIAL_RETRY_DELAY_MS * _initialConnectAttempts));
      }
    }
  }

  logger.error(`RabbitMQ: Failed to connect after ${INITIAL_MAX_ATTEMPTS} initial attempts.`);
  startPersistentRabbitMQReconnect();
}

function startPersistentRabbitMQReconnect(): void {
  if (_reconnectTimer) {
    return;
  }

  logger.info(
    `RabbitMQ: Starting persistent re-connection attempts every ${PERSISTENT_RECONNECT_INTERVAL_MS / 1000} seconds...`,
  );

  _reconnectTimer = setInterval(async () => {
    if (_connection && _channel) {
      logger.info("RabbitMQ: Reconnected via persistent check, stopping timer.");
      clearInterval(_reconnectTimer!);
      _reconnectTimer = null;
      return;
    }

    try {
      await _attemptSingleConnection();
    } catch (error) {
      logger.warn(getFormattedErrorMessage(error));
    }
  }, PERSISTENT_RECONNECT_INTERVAL_MS);
}

export function getRabbitMQChannel(): Channel | null {
  return _channel;
}

export async function closeRabbitMQ(): Promise<void> {
  if (_reconnectTimer) {
    clearInterval(_reconnectTimer);
    _reconnectTimer = null;
    logger.info("RabbitMQ: Cleared persistent reconnect timer.");
  }

  if (_channel) {
    try {
      await _channel.close();
      logger.info("RabbitMQ: Channel closed.");
    } catch (error) {
      throw new Error(getFormattedErrorMessage(error, "RabbitMQ: Error closing RabbitMQ channel."));
    } finally {
      _channel = null;
    }
  }

  if (_connection) {
    try {
      await _connection.close();
    } catch (error) {
      throw new Error(getFormattedErrorMessage(error, "RabbitMQ: Error closing connection."));
    } finally {
      _connection = null;
    }
  }
}

export async function sendMessage(queue: string, message: string): Promise<boolean> {
  const channel = getRabbitMQChannel();

  if (channel) {
    try {
      await channel.assertQueue(queue, { durable: true });
      const published = channel.sendToQueue(queue, Buffer.from(message), { persistent: true });

      if (!published) {
        logger.warn(`RabbitMQ: Channel buffer full for queue "${queue}". Message might be delayed.`);
      }

      logger.info(`RabbitMQ: Sent message "${message}" to queue "${queue}".`);
      return true;
    } catch (error) {
      logger.error(getFormattedErrorMessage(error, `RabbitMQ: Failed to send message to queue "${queue}"`));
      return false;
    }
  } else {
    logger.warn(`RabbitMQ: Cannot send message "${message}": Channel not available.`);
    return false;
  }
}

export async function publishMessage(
  exchange: string,
  routingKey: string | undefined,
  message: string,
): Promise<boolean> {
  const channel = getRabbitMQChannel();

  if (channel) {
    try {
      const published = channel.publish(exchange, routingKey ?? "", Buffer.from(message), { persistent: true });

      if (!published) {
        logger.warn(
          `RabbitMQ: Channel buffer full for exchange "${exchange}", routing key "${routingKey}". Message might be delayed.`,
        );
      }

      logger.info(
        `RabbitMQ: Published message "${message}" to exchange "${exchange}" with routing key "${routingKey}".`,
      );
      return true;
    } catch (error) {
      logger.error(getFormattedErrorMessage(error, `RabbitMQ: Failed to publish message to exchange "${exchange}"`));
      return false;
    }
  } else {
    logger.warn(`RabbitMQ: Cannot publish message "${message}": Channel not available.`);
    return false;
  }
}

export async function startConsumingQueue(
  queueName: string,
  onMessageCallback: (msg: amqp.ConsumeMessage) => Promise<void>,
) {
  const channel = getRabbitMQChannel();

  if (!channel) {
    logger.error(`RabbitMQ: Cannot start consuming from ${queueName}. Channel not available.`);
    throw new Error("RabbitMQ: Channel not available for consuming.");
  }

  try {
    const { queue } = await channel.assertQueue(queueName, { durable: true });

    await channel.consume(
      queue,
      async (msg) => {
        if (msg !== null) {
          await onMessageCallback(msg);

          channel.ack(msg);
        }
      },
      { noAck: false },
    );

    logger.info(`RabbitMQ: Started consuming from queue: ${queueName}`);
  } catch (error) {
    logger.error(getFormattedErrorMessage(error, `RabbitMQ: Error setting up consumer for queue ${queueName}`));
    throw error;
  }
}

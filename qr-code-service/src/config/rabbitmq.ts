import amqp, { Channel, ChannelModel } from "amqplib";
import logger from "./logger.js";
import { getFormattedErrorMessage } from "../lib/error.js";

let _connection: ChannelModel | null = null;
let _channel: Channel | null = null;
let _reconnectTimer: NodeJS.Timeout | null = null;

const AMQP_URL = `amqp://user:pass@localhost:5672`;

export async function connectRabbitMQ() {
  if (_connection && _channel) {
    logger.info("RabbitMQ connection already established.");
    return;
  }

  try {
    logger.info("Attempting to establish new RabbitMQ connection...");
    const connection = await amqp.connect(AMQP_URL);
    const channel = await connection.createChannel();

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
    });

    _connection.on("error", (error: unknown) => {
      logger.error("RabbitMQ connection error:", error);
    });

    logger.info("Successfully connected to RabbitMQ!");
  } catch (error) {
    logger.error(getFormattedErrorMessage(`Failed to establish RabbitMQ connection!`, error));

    _channel = null;
    _connection = null;

    throw error;
  }
}

export function getRabbitMQChannel() {
  if (!_channel) {
    logger.warn("RabbitMQ channel not available.");
  }

  return _channel;
}

export async function startConsumingQueue(
  queueName: string,
  onMessageCallback: (msg: amqp.ConsumeMessage) => Promise<void>,
) {
  const channel = getRabbitMQChannel();

  if (!channel) {
    logger.error(`Cannot start consuming from ${queueName}: RabbitMQ channel not available.`);
    throw new Error("RabbitMQ channel not available for consuming.");
  }

  try {
    const { queue } = await channel.assertQueue(queueName, { durable: true });

    await channel.consume(
      queue,
      async (msg) => {
        if (msg !== null) {
          await onMessageCallback(msg);

          channel.ack(msg);
          logger.info(`Acknowledged message ID ${msg.properties.appId}`);
        }
      },
      { noAck: false },
    );

    logger.info(`Started consuming from queue: ${queueName}`);
  } catch (error) {
    logger.error(getFormattedErrorMessage(`Error setting up consumer for queue ${queueName}`, error));
    throw error;
  }
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
      logger.error(getFormattedErrorMessage("Error closing RabbitMQ channel.", error));
    } finally {
      _channel = null;
    }
  }

  if (_connection) {
    try {
      await _connection.close();
      logger.info("RabbitMQ connection closed.");
    } catch (error) {
      logger.error(getFormattedErrorMessage("Error closing RabbitMQ connection.", error));
    } finally {
      _connection = null;
    }
  }
}

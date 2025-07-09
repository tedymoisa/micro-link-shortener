import amqp, { Channel, ChannelModel } from "amqplib";

let _connection: ChannelModel | null = null; // Corrected type to Connection
let _channel: Channel | null = null;
let _reconnectTimer: NodeJS.Timeout | null = null; // To manage the persistent reconnection interval

const AMQP_URL = `amqp://user:pass@localhost:5672`;
const INITIAL_MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 2000;
const PERSISTENT_RECONNECT_INTERVAL_MS = 10000;

async function attemptRabbitMQConnection(): Promise<void> {
  if (_connection && _channel) {
    console.info(
      "RabbitMQ connection already established. Skipping new attempt."
    );
    return;
  }

  try {
    console.info("Attempting to establish new RabbitMQ connection...");
    const connection = await amqp.connect(AMQP_URL);
    const channel = await connection.createChannel();

    if (_reconnectTimer) {
      clearInterval(_reconnectTimer);
      _reconnectTimer = null;
      console.info("RabbitMQ reconnected, clearing persistent retry timer.");
    }

    _connection = connection;
    _channel = channel;

    _connection.on("close", (error: unknown) => {
      if (error) {
        console.error("RabbitMQ connection closed with error:", error);
      } else {
        console.warn("RabbitMQ connection closed gracefully.");
      }
      _channel = null;
      _connection = null;

      startPersistentRabbitMQReconnect();
    });

    _connection.on("error", (error: unknown) => {
      console.error("RabbitMQ connection error:", error);
    });

    console.info("Successfully connected to RabbitMQ!");
  } catch (error) {
    console.error(`Failed to establish RabbitMQ connection!`);
    _channel = null;
    _connection = null;
    throw error;
  }
}

export async function connectRabbitMQ() {
  if (_channel && _connection) {
    console.info("RabbitMQ already connected!");
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
      console.warn(
        `Initial RabbitMQ connection attempt ${
          i + 1
        }/${INITIAL_MAX_RETRIES} failed.`
      );
      if (i < INITIAL_MAX_RETRIES - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, INITIAL_RETRY_DELAY_MS * (i + 1))
        );
      }
    }
  }

  console.error(
    `Failed to connect to RabbitMQ after ${INITIAL_MAX_RETRIES} initial attempts.`
  );

  startPersistentRabbitMQReconnect();

  throw new Error("RabbitMQ connection could not be established at startup.");
}

function startPersistentRabbitMQReconnect(): void {
  if (_reconnectTimer) {
    return;
  }

  console.info(
    `Starting persistent RabbitMQ re-connection attempts every ${
      PERSISTENT_RECONNECT_INTERVAL_MS / 1000
    } seconds...`
  );

  _reconnectTimer = setInterval(async () => {
    if (_connection && _channel) {
      console.info(
        "RabbitMQ reconnected via persistent check, stopping timer."
      );
      clearInterval(_reconnectTimer!);
      _reconnectTimer = null;
      return;
    }

    try {
      await attemptRabbitMQConnection();
    } catch (error) {
      console.warn(`Persistent RabbitMQ re-connection attempt failed.`);
    }
  }, PERSISTENT_RECONNECT_INTERVAL_MS);
}

export function getRabbitMQChannel() {
  if (!_channel) {
    console.warn("RabbitMQ channel not available.");
  }

  return _channel;
}

export async function startConsuming(
  onMessageCallback: (
    msg: amqp.ConsumeMessage,
    channel: Channel
  ) => Promise<void>
) {
  const channel = getRabbitMQChannel();

  if (!channel) {
    console.error(
      `Cannot start consuming from "url_exchange": RabbitMQ channel not available.`
    );
    throw new Error("RabbitMQ channel not available for consuming.");
  }

  try {
    await channel.assertExchange("url_exchange", "fanout", {
      durable: true,
    });
    console.info(`Asserted exchange: "url_exchange" for consuming.`);

    const { queue } = await channel.assertQueue("", { durable: true });
    console.info(`Asserted queue: "${queue}" for consuming.`);

    await channel.bindQueue(queue, "url_exchange", "");
    console.info(
      `[Audit Topology] Bound queue "${queue}" to exchange "url_exchange".`
    );

    await channel.consume(
      queue,
      async (msg) => {
        if (msg !== null) {
          await onMessageCallback(msg, channel);
        }
      },
      { noAck: false }
    );

    console.info(`Started consuming from exchange: "url_exchange"`);
  } catch (error) {
    console.error(`Error setting up consumer for exchange "url_exchange".`);
    throw error;
  }
}

export async function closeRabbitMQ() {
  if (_reconnectTimer) {
    clearInterval(_reconnectTimer);
    _reconnectTimer = null;
    console.info("Cleared RabbitMQ persistent reconnect timer.");
  }

  if (_channel) {
    try {
      await _channel.close();
      console.info("RabbitMQ channel closed.");
    } catch (error) {
      console.error("Error closing RabbitMQ channel.");
    } finally {
      _channel = null;
    }
  }

  if (_connection) {
    try {
      await _connection.close();
      console.info("RabbitMQ connection closed.");
    } catch (error) {
      console.error("Error closing RabbitMQ connection.");
    } finally {
      _connection = null;
    }
  }
}

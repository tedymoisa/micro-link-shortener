import env from "./config/env.js";
import logger from "./config/logger.js";
// import "./config/db.js";

import express from "express";
import pinoHttp from "pino-http";
import routes from "./routes/index.js";
import { closeRabbitMQ, connectRabbitMQ } from "./config/rabbitmq.js";
import { RABBIT_MQ_EXHANGES } from "./lib/rabbitmq-exhanges.js";

const port = env.PORT;

const app = express();

app.use(express.json());

async function startApplication() {
  try {
    logger.info("Attempting to connect to RabbitMQ...");
    const rabbitMQChannel = await connectRabbitMQ();
    logger.info("RabbitMQ connection successful.");

    await rabbitMQChannel.assertExchange(RABBIT_MQ_EXHANGES.QR_CODE_SERVICE_EXCHANGE, "fanout", {
      durable: true,
    });
    logger.info(`RabbitMQ exchange '${RABBIT_MQ_EXHANGES.QR_CODE_SERVICE_EXCHANGE}' asserted.`);

    // 2. Connect to Kafka
    // logger.info("Attempting to connect to Kafka...");
    // const { producer: kafkaProducer, consumer: kafkaConsumer } = await connectKafka();
    // logger.info("Kafka connection successful.");

    // // Example: Set up a Kafka consumer to listen to a topic
    // const KAFKA_TOPIC = "my-app-topic";
    // await kafkaConsumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: true });
    // logger.info(`Kafka consumer subscribed to topic '${KAFKA_TOPIC}'.`);

    // // Run the Kafka consumer process in the background
    // kafkaConsumer.run({
    //   eachMessage: async ({ topic, partition, message }) => {
    //     logger.info(
    //       {
    //         topic,
    //         partition,
    //         offset: message.offset,
    //         value: message.value.toString(),
    //       },
    //       "Received Kafka message",
    //     );
    //     // Add your message processing logic here
    //   },
    // });

    app.use(pinoHttp.default({ logger }));
    app.use("/", routes);

    app.listen(port, () => {
      logger.info(`Server running on http://localhost:${port}`);
    });

    const shutdown = async () => {
      logger.info("Initiating graceful shutdown...");
      // await closeKafka();
      await closeRabbitMQ();
      logger.info("All connections closed. Exiting application.");
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    logger.error("Application failed to start due to critical connection error:", error);
    process.exit(1);
  }
}

startApplication();

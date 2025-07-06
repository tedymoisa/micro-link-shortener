import app from "./app.js";
import { env } from "./config/env.js";
import logger from "./config/logger.js";
import "./config/db.js";
import { getRabbitMqChannel } from "./config/rabbitmq.js";

const port = env.PORT;

(async () => {
  await getRabbitMqChannel();
})();

app.listen(port, () => {
  logger.info(`Server running on http://localhost:${port}`);
});

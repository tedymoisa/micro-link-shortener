import env from "./config/env.js";
import logger from "./config/logger.js";
import "./config/instrumentation.js";
import "./config/rabbitmq.js";
import "./config/db.js";

import express from "express";
import pinoHttp from "pino-http";
import routes from "./routes/index.js";

const port = env.PORT;

const app = express();

app.use(express.json());
app.use(pinoHttp.default({ logger }));

app.use("/", routes);

app.listen(port, () => {
  logger.info(`Server running on http://localhost:${port}`);
});

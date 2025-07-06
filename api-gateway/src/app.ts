import express from "express";
import pinoHttp from "pino-http";
import logger from "./config/logger.js";
import routes from "./routes/index.js";

const app = express();

app.use(express.json());
app.use(pinoHttp.default({ logger }));

app.use("/", routes);

export default app;

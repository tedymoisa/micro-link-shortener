import express from "express";
import routes from "../routes";
import pinoHttp from "pino-http";
import logger from "./logger";

const app = express();

app.use(express.json());
app.use(pinoHttp({ logger }));
app.use("/", routes);

export default app;

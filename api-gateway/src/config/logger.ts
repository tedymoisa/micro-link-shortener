import pino from "pino";
import { env } from "./env.js";

const logger = pino.default({
  level: env.LOG_LEVEL,
  transport:
    env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: { colorize: true },
        }
      : undefined,
});

export default logger;

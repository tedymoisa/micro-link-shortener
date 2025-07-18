import pino from "pino";
import env from "./env.js";

const commonRedactionPaths = [
  "password",
  "token",
  "secret",
  "apiKey",
  "email",
  "address",
  "creditCard",
  "socialSecurityNumber",
  "ssn",
  "headers.authorization",
  "req.headers.cookie",
  "ip",
];

const logger = pino.default({
  level: env.LOG_LEVEL,
  base: {
    pid: process.pid,
    hostname: process.env.HOSTNAME || "unknown",
  },
  redact: {
    paths: commonRedactionPaths,
    censor: "[Redacted]",
  },
  transport:
    env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:HH:MM:ss Z",
            ignore: "pid,hostname",
          },
        }
      : undefined,
});

export default logger;

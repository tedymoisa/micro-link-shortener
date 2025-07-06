import app from "./config/app.js";
import { env } from "./config/env.js";
import logger from "./config/logger.js";

const port = env.PORT;

app.listen(port, () => {
  logger.info(`Server running on http://localhost:${port}`);
});

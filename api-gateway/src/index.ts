import app from "./config/app";
import { env } from "./config/env";
import logger from "./config/logger";

const port = env.PORT;

app.listen(port, () => {
  logger.info(`Server running on http://localhost:${port}`);
});

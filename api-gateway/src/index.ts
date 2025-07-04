import app from "./config/app";
import logger from "./config/logger";

const port = process.env.PORT || 3000;

app.listen(port, () => {
  logger.info(`Server running on http://localhost:${port}`);
  console.log(`Server running on http://localhost:${port}`);
});

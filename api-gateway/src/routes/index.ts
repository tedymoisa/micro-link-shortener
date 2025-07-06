import { Router } from "express";
import urlRouter from "./url-routes.js";

const router = Router();

router.get("/", (req, res) => {
  req.log.info("Hello from Express with TypeScript!");
  res.send("Hello from Express with TypeScript!");
});

router.use("/api", urlRouter);

export default router;

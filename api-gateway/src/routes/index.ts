import { Router } from "express";
import { UrlRouter } from "./url-routes.js";

const createMainRouter = (urlRouter: UrlRouter) => {
  const router = Router();

  router.get("/", (req, res) => {
    req.log.info("Hello from Express with TypeScript!");
    res.send("Hello from Express with TypeScript!");
  });

  router.use("/api", urlRouter);

  return router;
};

export default createMainRouter;

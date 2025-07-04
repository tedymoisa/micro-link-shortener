import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  req.log.info("Hello from Express with TypeScript!");
  res.send("Hello from Express with TypeScript!");
});

// router.use("/api/greet", greetRoutes);

export default router;

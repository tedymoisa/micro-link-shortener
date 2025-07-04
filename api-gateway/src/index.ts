import express, { Request, Response } from "express";

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Basic route
app.get("/", (req: Request, res: Response) => {
  res.send("Hello from Express with TypeScript!");
});

// Another example route
app.get("/api/greet/:name", (req: Request, res: Response) => {
  const { name } = req.params;
  res.json({ message: `Greetings, ${name}!` });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

import express from "express";
import cors from "cors";
import morgan from "morgan";
import { config } from "./config/erpnext.config.js";
import apiRouter from "./routes/index.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();

// Middlewares
app.use(
  cors({
    origin: [config.frontendUrl, "http://localhost:3000", "http://localhost:5173"],
    credentials: true,
  })
);

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Healthcheck
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Aether ERPNext Middleware Backend",
    erpnextTarget: config.erpnext.baseUrl,
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api", apiRouter);

// Error Handling Middleware
app.use(errorHandler);

// Start Server
app.listen(config.port, () => {
  console.log(`🚀 Aether Backend Middleware running on http://localhost:${config.port}`);
  console.log(`🔗 Connected ERPNext target: ${config.erpnext.baseUrl}`);
});

import "dotenv/config";
import express from "express";
import cors from "cors";

import healthRoutes from "./routes/health.routes.js";
import tradeRoutes from "./routes/trade.routes.js";
import invoiceRoutes from "./routes/invoice.routes.js";
import escrowRoutes from "./routes/escrow.routes.js";
import paymentRoutes from "./routes/payment.routes.js";

const app = express();

app.use(cors());

app.use(express.json());
app.use("/api", healthRoutes);
app.use("/api", tradeRoutes);
app.use("/api", invoiceRoutes);
app.use("/api/escrows", escrowRoutes);
app.use("/api/payments", paymentRoutes);

// Global Error Handler Middleware
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (err) {
      console.error("Express Error:", err.message || err);
      const message = err.message || "An unexpected error occurred";
      const isClientError =
        message.includes("not supported") ||
        message.includes("allowed") ||
        err.name === "MulterError";

      res.status(isClientError ? 400 : 500).json({
        success: false,
        message,
      });
      return;
    }
  },
);

const PORT = process.env.PORT || 3000;

app.get("/", (_req, res) => {
  res.json({
    message: "StoreOnChain backend is running",
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

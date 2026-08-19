import "dotenv/config";
import express from "express";
import tradeRoutes from "./routes/trade.routes.js";
import invoiceRoutes from "./routes/invoice.routes.js";

const app = express();

app.use(express.json());
app.use("/api", tradeRoutes);
app.use("/api", invoiceRoutes);

const PORT = process.env.PORT || 3000;

app.get("/", (_req, res) => {
  res.json({
    message: "StoreOnChain backend is running",
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

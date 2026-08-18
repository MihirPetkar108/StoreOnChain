import "dotenv/config";
import express from "express";
import tradeRoutes from "./routes/trade.routes.js";

const app = express();

app.use(express.json());
app.use("/api", tradeRoutes);

const PORT = process.env.PORT || 3000;

app.get("/", (_req, res) => {
  res.json({
    message: "StoreOnChain backend is running",
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

import { Router } from "express";
import { processInvoiceController } from "../controllers/invoice.controller.js";
import { upload } from "../utilities/storage.js";

const router = Router();

// ============================================================
// PROCESS INVOICE
// POST /api/invoices/process
//
// multipart/form-data
//
// Field:
// invoice -> invoice image/PDF
// ============================================================

router.post(
  "/invoice/process",
  upload.single("invoice"),
  processInvoiceController,
);

export default router;

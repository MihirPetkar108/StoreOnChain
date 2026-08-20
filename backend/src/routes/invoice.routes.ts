import { Router } from "express";
import {
  getInvoiceController,
  processInvoiceController,
  verifyInvoiceController,
} from "../controllers/invoice.controller.js";
import { uploadSingle } from "../utilities/storage.js";

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
  uploadSingle("invoice"),
  processInvoiceController,
);

router.get("/invoice/verify", uploadSingle("verify"), verifyInvoiceController);

router.get("/invoice/document", getInvoiceController);

export default router;

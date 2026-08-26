import { Router } from "express";
import {
  getInvoiceController,
  verifyInvoiceController,
} from "../controllers/invoice.controller.js";
import { uploadSingle } from "../utilities/storage.js";

const router = Router();

router.post("/invoice/verify", uploadSingle("verify"), verifyInvoiceController);

router.get("/invoice/document", getInvoiceController);

export default router;

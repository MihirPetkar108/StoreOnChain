import { extractInvoiceFields } from "../services/invoice.service.js";
import { extractTextFromImage } from "../services/ocr.service.js";

// Run Command: npx tsx src/tests/invoice.service.test.ts

console.log("========================================");
console.log("INVOICE SERVICE TEST");
console.log("========================================");

// const ocrText = `
// INVOICE
// Invoice Number: INV-2026-001
// Exporter ID: EX-9281
// Importer ID: IM-2045
// Product: Cotton
// Quantity: 10000
// Total Invoice Amount (USD): 26700.00
// Currency: USD
// Invoice Date: 2026-08-19
// Due Date: 2026-09-19
// `;

const ocrText = await extractTextFromImage(
  `src/tests/invoice_test_data/invoice10.png`,
);

console.log("\nOCR TEXT:");
console.log(ocrText);

const invoice = extractInvoiceFields(ocrText);

console.log("\n========================================");
console.log("EXTRACTED INVOICE");
console.log("========================================");

console.log("Invoice Number:", invoice.invoiceNumber);
console.log("Product:", invoice.product);
console.log("Quantity:", invoice.quantity);
console.log("Invoice Amount:", invoice.invoiceAmount);
console.log("Currency:", invoice.currency);
console.log("Invoice Date:", invoice.invoiceDate);
console.log("Due Date:", invoice.dueDate);

console.log("\n========================================");
console.log("INVOICE TEST SUCCESSFUL");
console.log("========================================");

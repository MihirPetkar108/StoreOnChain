import { createWorker } from "tesseract.js";

// ============================================================
// OCR SERVICE
// Extracts text from invoice images.
// ============================================================

export async function extractTextFromImage(imagePath: string): Promise<string> {
  const worker = await createWorker("eng");

  try {
    const {
      data: { text },
    } = await worker.recognize(imagePath);

    return text.trim();
  } finally {
    await worker.terminate();
  }
}

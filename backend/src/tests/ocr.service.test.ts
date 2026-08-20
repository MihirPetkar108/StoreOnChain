import { hashInvoiceData } from "../services/hashing.service.js";
import { extractTextFromImage } from "../services/ocr.service.js";

// Run this command:- npx tsx src/tests/ocr.service.test.ts

async function testOCR(imagePath: string) {
  try {
    // console.log("========================================");
    // console.log("OCR SERVICE TEST");
    // console.log("========================================");

    // console.log("Reading invoice:");
    // console.log(imagePath);
    // console.log("");

    const extractedText = await extractTextFromImage(imagePath);

    // console.log("========================================");
    // console.log("EXTRACTED TEXT");
    // console.log("========================================");

    // console.log(extractedText);

    // console.log("");
    // console.log("========================================");
    // console.log("OCR TEST SUCCESSFUL");
    // console.log("========================================");

    // console.log("");
    // console.log("========================================");
    // console.log("GET HASH OF EXTRACTED TEXT");
    // console.log("========================================");
    // const hash = await hashInvoiceData(extractedText);
    // console.log("Hash of extracted text:", hash);
    // return hash;
  } catch (error) {
    // console.error("");
    // console.error("========================================");
    // console.error("OCR TEST FAILED");
    // console.error("========================================");

    console.error(error);
  }
}

// ===========================================
// SAME INVOICES TEST
// ===========================================

for (let i = 1; i <= 10; i++) {
  const hash1 = await testOCR(`src/tests/invoice_test_data/invoice${i}.png`);
  const hash2 = await testOCR(`src/tests/invoice_test_data/invoice${i}.png`);

  // if (hash1 && hash2) {
  //   if (hash1 === hash2) {
  //     console.log(i + ". Hashes are the same.");
  //   } else {
  //     console.log(i + ". Hashes are different.");
  //   }
  // }
}

// ===========================================
//DIFFERENT INVOICES TEST
// ===========================================

// for (let i = 1; i <= 9; i++) {
//   const hash1 = await testOCR(`src/tests/invoice_test_data/invoice${i}.png`);
//   const hash2 = await testOCR(
//     `src/tests/invoice_test_data/invoice${i + 1}.png`,
//   );

//   if (hash1 && hash2) {
//     // console.log("");
//     // console.log("========================================");
//     // console.log("HASH COMPARISON");
//     // console.log("========================================");

//     if (hash1 === hash2) {
//       console.log(i + ". Hashes are the same.");
//     } else {
//       console.log(i + ". Hashes are different.");
//     }
//   }
// }

// import { describe, expect, it } from "vitest";
// import { hashInvoiceData } from "../services/hashing.service.js";

// describe("hashInvoiceData", () => {
//   it("should generate a SHA-256 hash", () => {
//     const data =
//       '{"invoiceNumber":"INV-10293","exporterId":"EX-9281","quantity":10000}';

//     const hash = hashInvoiceData(data);

//     expect(hash).toHaveLength(64);
//     expect(hash).toMatch(/^[a-f0-9]{64}$/);
//     console.log("Generated hash:", hash);
//   });

//   it("should generate the same hash for the same data", () => {
//     const data =
//       '{"invoiceNumber":"INV-10293","exporterId":"EX-9281","quantity":10000}';

//     const hash1 = hashInvoiceData(data);
//     const hash2 = hashInvoiceData(data);

//     expect(hash1).toBe(hash2);
//     console.log("Generated hash1:", hash1);
//     console.log("Generated hash2:", hash2);
//   });

//   it("should generate different hashes when the data changes", () => {
//     const data1 =
//       '{"invoiceNumber":"INV-10293","exporterId":"EX-9281","quantity":10000}';

//     const data2 =
//       '{"invoiceNumber":"INV-10293","exporterId":"EX-9281","quantity":12000}';

//     const hash1 = hashInvoiceData(data1);
//     const hash2 = hashInvoiceData(data2);

//     expect(hash1).not.toBe(hash2);
//     console.log("Generated hash1:", hash1);
//     console.log("Generated hash2:", hash2);
//   });
// });

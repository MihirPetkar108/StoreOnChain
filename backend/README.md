# StoreOnChain Backend API

The backend runs on port `3000` by default. Set the `PORT` environment variable to use a different port.

Base URL:

```text
http://localhost:3000
```

## Endpoints

### Health

| Method | Path | Description                                               |
| ------ | ---- | --------------------------------------------------------- |
| `GET`  | `/`  | Returns a message confirming that the backend is running. |

### Invoices

| Method | Path                    | Request                                                                                                                                                                             |
| ------ | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/api/invoice/process`  | `multipart/form-data` with the invoice file in the `invoice` field. Processes and stores the invoice, then returns its hash.                                                        |
| `GET`  | `/api/invoice/verify`   | `multipart/form-data` with the invoice file in the `verify` field and `transactionId` in the request body. Compares the uploaded invoice hash with the hash recorded for the trade. |
| `GET`  | `/api/invoice/document` | Request body containing `transactionId`. Returns the stored invoice as a downloadable binary document.                                                                              |

### Trades

| Method | Path                          | Request                                                                                                                                     |
| ------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/api/trades`                 | `multipart/form-data` with the invoice file in the `invoice` field and trade data in the request body. Records the trade on the blockchain. |
| `GET`  | `/api/trades?status=<status>` | Requires the `status` query parameter. Returns trades matching that status.                                                                 |
| `GET`  | `/api/trades/:transactionId`  | `transactionId` path parameter. Returns one trade.                                                                                          |

### Exporters

| Method | Path                                                | Request                                                                                                                         |
| ------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/api/exporters/:exporterId/trades`                 | `exporterId` path parameter. Returns the exporter's trade IDs and total trade count.                                            |
| `GET`  | `/api/exporters/:exporterId/trades?status=<status>` | `exporterId` path parameter and required `status` query parameter. Intended to return the exporter's trades filtered by status. |
| `GET`  | `/api/exporters/:exporterId/reputation`             | `exporterId` path parameter. Returns the exporter's reputation metrics.                                                         |

## Notes

- Invoice upload endpoints use `multipart/form-data` and Multer for file handling.
- The two exporter trade routes share the same path, `/api/exporters/:exporterId/trades`. Express registers the unfiltered handler first, so the status-filtered handler is currently shadowed and will not be reached for matching requests.

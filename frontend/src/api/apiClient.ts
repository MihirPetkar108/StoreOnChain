import type {
  Trade,
  VerifyInvoiceResponse,
  RecordTradePayload,
  TradesByStatusResponse,
  ExporterTradesResponse,
  ExporterReputationResponse,
  MarketplaceListing,
} from "../types";

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

/**
 * Helper to make HTTP requests including GET requests with body/FormData via XMLHttpRequest
 * because standard browser fetch prohibits body in GET/HEAD requests.
 */
function sendRequest<T = any>(
  method: string,
  url: string,
  body?: FormData | object | string,
  responseType: "json" | "blob" = "json",
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.responseType = responseType;

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response);
      } else {
        let errMessage = `HTTP ${xhr.status}: ${xhr.statusText}`;
        if (
          xhr.responseType === "json" &&
          xhr.response &&
          xhr.response.message
        ) {
          errMessage = xhr.response.message;
          reject(new Error(errMessage));
        } else if (
          xhr.responseType === "blob" &&
          xhr.response instanceof Blob
        ) {
          // Server returned an error as JSON but we requested a blob.
          // Read the blob as text to extract the error message.
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const parsed = JSON.parse(reader.result as string);
              if (parsed.message) errMessage = parsed.message;
            } catch {
              // not JSON, keep default errMessage
            }
            reject(new Error(errMessage));
          };
          reader.onerror = () => reject(new Error(errMessage));
          reader.readAsText(xhr.response);
        } else {
          try {
            const parsed = JSON.parse(xhr.responseText);
            if (parsed.message) errMessage = parsed.message;
          } catch {
            // ignore JSON parse error
          }
          reject(new Error(errMessage));
        }
      }
    };

    xhr.onerror = () => {
      reject(
        new Error("Network connection error. Is the backend server running?"),
      );
    };

    if (body instanceof FormData) {
      xhr.send(body);
    } else if (typeof body === "object") {
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send(JSON.stringify(body));
    } else {
      xhr.send(body);
    }
  });
}

export const api = {
  async getListings(): Promise<{
    success: boolean;
    listings?: MarketplaceListing[];
    message?: string;
  }> {
    return sendRequest("GET", `${BASE_URL}/api/listings`);
  },
  // GET / -> Health check
  async checkHealth(): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${BASE_URL}/`);
      const data = await res.json();
      return { success: res.ok, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message || "Backend offline" };
    }
  },

  // POST /api/invoice/verify
  async verifyInvoice(
    file: File,
    transactionId: string,
  ): Promise<VerifyInvoiceResponse> {
    const formData = new FormData();
    formData.append("verify", file);
    formData.append("transactionId", transactionId);
    return sendRequest<VerifyInvoiceResponse>(
      "POST",
      `${BASE_URL}/api/invoice/verify`,
      formData,
    );
  },

  // GET /api/invoice/document
  async downloadInvoiceDocument(transactionId: string): Promise<Blob> {
    return sendRequest<Blob>(
      "GET",
      `${BASE_URL}/api/invoice/document?transactionId=${encodeURIComponent(transactionId)}`,
      undefined,
      "blob",
    );
  },

  // POST /api/trades
  async recordTrade(payload: RecordTradePayload): Promise<{
    success: boolean;
    message: string;
    data?: Trade;
  }> {
    const formData = new FormData();
    if (payload.invoiceFile) {
      formData.append("invoice", payload.invoiceFile);
    }
    if (payload.razorpayOrderId) {
      formData.append("razorpayOrderId", payload.razorpayOrderId);
    }
    if (payload.razorpayPaymentId) {
      formData.append("razorpayPaymentId", payload.razorpayPaymentId);
    }
    if (payload.paymentMethod) {
      formData.append("paymentMethod", payload.paymentMethod);
    }
    if (payload.cryptoTxHash) {
      formData.append("cryptoTxHash", payload.cryptoTxHash);
    }
    if (payload.cryptoAsset) {
      formData.append("cryptoAsset", payload.cryptoAsset);
    }
    if (payload.transactionId) {
      formData.append("transactionId", payload.transactionId);
    }
    formData.append("listingId", payload.listingId);
    formData.append("exporterId", payload.exporterId);
    formData.append("importerId", payload.importerId);
    formData.append("quantity", payload.quantity.toString());
    formData.append("totalAmount", payload.totalAmount.toString());
    formData.append("currency", payload.currency);
    formData.append("tradeStatus", payload.tradeStatus);
    formData.append("inspectionStatus", payload.inspectionStatus);
    formData.append("disputeStatus", payload.disputeStatus);
    formData.append("settlementStatus", payload.settlementStatus);
    formData.append("expectedDelivery", payload.expectedDelivery);
    formData.append("actualDelivery", payload.actualDelivery);


    return sendRequest("POST", `${BASE_URL}/api/trades`, formData);
  },

  // GET /api/trades?status=<status>
  async getTradesByStatus(status: string): Promise<TradesByStatusResponse> {
    return sendRequest<TradesByStatusResponse>(
      "GET",
      `${BASE_URL}/api/trades?status=${encodeURIComponent(status)}`,
    );
  },

  // GET /api/trades/:transactionId
  async getTradeById(transactionId: string): Promise<{
    success: boolean;
    trade?: Trade;
    trades?: Trade[];
    message?: string;
  }> {
    return sendRequest(
      "GET",
      `${BASE_URL}/api/trades/${encodeURIComponent(transactionId)}`,
    );
  },

  // GET /api/exporters/:exporterId/trades
  async getExporterTrades(
    exporterId: string,
    status?: string,
  ): Promise<ExporterTradesResponse> {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return sendRequest<ExporterTradesResponse>(
      "GET",
      `${BASE_URL}/api/exporters/${encodeURIComponent(exporterId)}/trades${query}`,
    );
  },

  // GET /api/exporters/:exporterId/reputation
  async getExporterReputation(
    exporterId: string,
  ): Promise<ExporterReputationResponse> {
    return sendRequest<ExporterReputationResponse>(
      "GET",
      `${BASE_URL}/api/exporters/${encodeURIComponent(exporterId)}/reputation`,
    );
  },
};

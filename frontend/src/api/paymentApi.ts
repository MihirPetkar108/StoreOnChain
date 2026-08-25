const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export interface CreatePaymentOrderPayload {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_due: number;
  amount_paid: number;
  currency: string;
  receipt: string | null;
  status: string;
}

export interface CreatePaymentOrderResponse {
  success: boolean;
  message: string;
  order?: RazorpayOrder;
}

export interface VerifyPaymentResponse {
  success: boolean;
  verified?: boolean;
  message: string;
}

export async function createPaymentOrder(
  payload: CreatePaymentOrderPayload,
): Promise<CreatePaymentOrderResponse> {
  const response = await fetch(`${BASE_URL}/api/payments/order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to create Razorpay order");
  }

  return data;
}

export async function verifyPayment(payload: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<VerifyPaymentResponse> {
  const response = await fetch(`${BASE_URL}/api/payments/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Payment verification failed");
  }

  return data;
}

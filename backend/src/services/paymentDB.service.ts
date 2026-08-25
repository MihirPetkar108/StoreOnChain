import { supabase } from "../config/supabase.config.js";

export interface CreatePaymentData {
  escrow_id: string;
  trade_id: string;
  amount: number;
  currency: string;
  method: "RAZORPAY" | "CRYPTO";
  status: "CREATED" | "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
  provider_order_id?: string | null;
  provider_payment_id?: string | null;
}

export async function createPayment(data: CreatePaymentData) {
  const { data: payment, error } = await supabase
    .from("payments")
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(`Failed to create payment: ${error.message}`);
  return payment;
}

export async function deletePayment(paymentId: string): Promise<void> {
  const { error } = await supabase
    .from("payments")
    .delete()
    .eq("id", paymentId);
  if (error) throw new Error(`Failed to delete payment: ${error.message}`);
}

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export interface PrepareCryptoPaymentPayload {
  tradeId: string;
  payerAddress: string;
  asset: "ETH" | "USDC";
  payeeAddress?: string;
  // The backend derives amount/currency from the locked trade payment.
  amount?: number;
  currency?: string;
}

export interface ConfirmCryptoPaymentPayload {
  tradeId: string;
  txHash: string;
  walletAddress: string;
}

export interface PrepareCryptoPaymentResponse {
  success: boolean;
  message: string;
  data?: {
    tradeId: string;
    network: string;
    chainId: string;
    asset: "ETH" | "USDC";
    escrowContract: string;
    tokenAddress: string;
    amount: string;
    amountInUnits: string;
    decimals: number;
    ethUsdRate?: number;
  };
}

export interface ConfirmCryptoPaymentResponse {
  success: boolean;
  message: string;
  data?: {
    success: boolean;
    payment: any;
    txHash: string;
  };
}

export async function prepareCryptoPayment(
  payload: PrepareCryptoPaymentPayload,
): Promise<PrepareCryptoPaymentResponse> {
  const response = await fetch(`${BASE_URL}/api/crypto/prepare`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to prepare crypto payment");
  }

  return data;
}

export async function confirmCryptoPayment(
  payload: ConfirmCryptoPaymentPayload,
): Promise<ConfirmCryptoPaymentResponse> {
  const response = await fetch(`${BASE_URL}/api/crypto/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to confirm crypto payment");
  }

  return data;
}


export async function getTokenBalance(address: string): Promise<string> {
  const response = await fetch(`${BASE_URL}/api/crypto/balance/${address}`);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to get token balance");
  }

  return data.balance;
}

export async function getTokenAllowance(
  owner: string,
  spender: string,
): Promise<string> {
  const response = await fetch(
    `${BASE_URL}/api/crypto/allowance/${owner}/${spender}`,
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to get token allowance");
  }

  return data.allowance;
}
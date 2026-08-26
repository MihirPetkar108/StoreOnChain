import {
  getExporterReputation,
  getExporterTradeIds,
  getTrade,
} from "./tradeLedger.service.js";

// ============================================================
// TRUST SCORE FORMULA WEIGHTS
// ============================================================
//
// Trust Score =
//   0.25 × Successful Trade Rate
// + 0.15 × On-Time Delivery Rate
// + 0.15 × Quality Pass Rate
// + 0.10 × (1 − Dispute Rate)
// + 0.10 × (1 − Cancellation Rate)
// + 0.15 × Recent Performance
// + 0.10 × Verified Trade Score
// ============================================================

const WEIGHT_SUCCESSFUL_TRADE_RATE = 0.25;
const WEIGHT_ON_TIME_DELIVERY_RATE = 0.15;
const WEIGHT_QUALITY_PASS_RATE = 0.15;
const WEIGHT_DISPUTE_RATE = 0.1;
const WEIGHT_CANCELLATION_RATE = 0.1;
const WEIGHT_RECENT_PERFORMANCE = 0.15;
const WEIGHT_VERIFIED_TRADE_SCORE = 0.1;

// Number of recent trades to consider for Recent Performance
const RECENT_TRADES_WINDOW = 10;

// ============================================================
// PROSPECTIVE TRADE DATA
// ============================================================
// The trade being recorded right now (not yet on-chain).
// We need this to include it in the calculation.

export interface ProspectiveTrade {
  tradeStatus: string;
  inspectionStatus: string;
  disputeStatus: string;
  expectedDelivery: string;
  actualDelivery: string;
}

// ============================================================
// CALCULATE TRUST SCORE
// ============================================================

export async function calculateTrustScore(
  exporterId: string,
  prospectiveTrade: ProspectiveTrade,
): Promise<number> {
  // ----------------------------------------------------------
  // 1. FETCH EXISTING REPUTATION + TRADE HISTORY
  // ----------------------------------------------------------

  const reputation = await getExporterReputation(exporterId);
  const tradeIds = await getExporterTradeIds(exporterId);

  // ----------------------------------------------------------
  // 2. COLLECT RAW COUNTS FROM ON-CHAIN DATA
  //    Then add the prospective trade's contribution.
  // ----------------------------------------------------------

  let completedTrades = Number(reputation.successfulTrades);
  let cancelledTrades = Number(reputation.cancelledTrades);
  let disputedTrades = Number(reputation.disputedTrades);
  let totalTrades = Number(reputation.totalTrades);

  // On-time delivery rate from chain is in basis points (e.g. 9480 = 94.80%)
  let onTimeDeliveryRateBps = Number(reputation.onTimeDeliveryRate);

  // Quality pass rate from chain is in basis points
  let qualityPassRateBps = Number(reputation.qualityPassRate);

  // Inspected trades count (computed in getExporterReputation)
  // We need the raw inspected count. Since the blockchain reputation
  // service already computes this, we use it.
  // But we need the raw number to compute the verified trade score.
  // Let's reconstruct from the trades.

  let inspectedTrades = 0;
  const trades = await Promise.all(
    tradeIds.map((id: string) => getTrade(id)),
  );

  for (const trade of trades) {
    const inspStatus = trade.inspectionStatus.trim().toUpperCase();
    if (inspStatus === "PASSED" || inspStatus === "FAILED") {
      inspectedTrades++;
    }
  }

  // ----------------------------------------------------------
  // 3. INCLUDE PROSPECTIVE TRADE IN COUNTS
  // ----------------------------------------------------------

  const prospStatus = prospectiveTrade.tradeStatus.trim().toUpperCase();
  const prospInspection = prospectiveTrade.inspectionStatus
    .trim()
    .toUpperCase();
  const prospDispute = prospectiveTrade.disputeStatus.trim().toUpperCase();

  totalTrades += 1;

  if (prospStatus === "COMPLETED") {
    completedTrades += 1;
  } else if (prospStatus === "CANCELLED") {
    cancelledTrades += 1;
  }

  if (prospDispute !== "NONE") {
    disputedTrades += 1;
  }

  if (prospInspection === "PASSED" || prospInspection === "FAILED") {
    inspectedTrades += 1;
  }

  // ----------------------------------------------------------
  // 4. RECALCULATE ON-TIME DELIVERY WITH PROSPECTIVE TRADE
  // ----------------------------------------------------------
  // We need to recalculate if the prospective trade has delivery dates.

  if (prospectiveTrade.actualDelivery) {
    // Count existing delivered and on-time from trades
    let deliveredCount = 0;
    let onTimeCount = 0;

    for (const trade of trades) {
      const actual = Number(trade.actualDelivery);
      const expected = Number(trade.expectedDelivery);
      if (actual > 0) {
        deliveredCount++;
        if (expected > 0 && actual <= expected) {
          onTimeCount++;
        }
      }
    }

    // Add prospective
    deliveredCount += 1;
    const prospExpected = prospectiveTrade.expectedDelivery
      ? new Date(prospectiveTrade.expectedDelivery).getTime()
      : 0;
    const prospActual = prospectiveTrade.actualDelivery
      ? new Date(prospectiveTrade.actualDelivery).getTime()
      : 0;

    if (prospExpected > 0 && prospActual > 0 && prospActual <= prospExpected) {
      onTimeCount++;
    }

    onTimeDeliveryRateBps =
      deliveredCount > 0
        ? Math.floor((onTimeCount * 10000) / deliveredCount)
        : 0;
  }

  // ----------------------------------------------------------
  // 5. RECALCULATE QUALITY PASS RATE WITH PROSPECTIVE TRADE
  // ----------------------------------------------------------

  if (prospInspection === "PASSED" || prospInspection === "FAILED") {
    let passedCount = 0;
    let totalInspected = 0;

    for (const trade of trades) {
      const inspStatus = trade.inspectionStatus.trim().toUpperCase();
      if (inspStatus === "PASSED" || inspStatus === "FAILED") {
        totalInspected++;
        if (inspStatus === "PASSED") {
          passedCount++;
        }
      }
    }

    // Add prospective
    totalInspected += 1;
    if (prospInspection === "PASSED") {
      passedCount += 1;
    }

    qualityPassRateBps =
      totalInspected > 0
        ? Math.floor((passedCount * 10000) / totalInspected)
        : 0;
  }

  // ----------------------------------------------------------
  // 6. COMPUTE EACH FACTOR (0–100 scale)
  // ----------------------------------------------------------

  // Factor 1: Successful Trade Rate (0-100)
  const successfulTradeRate =
    totalTrades > 0 ? (completedTrades / totalTrades) * 100 : 0;

  // Factor 2: On-Time Delivery Rate (basis points → 0-100)
  const onTimeDeliveryRate = onTimeDeliveryRateBps / 100;

  // Factor 3: Quality Pass Rate (basis points → 0-100)
  const qualityPassRate = qualityPassRateBps / 100;

  // Factor 4: (1 − Dispute Rate) × 100
  const disputeRate =
    totalTrades > 0 ? (disputedTrades / totalTrades) * 100 : 0;
  const inverseDisputeRate = 100 - disputeRate;

  // Factor 5: (1 − Cancellation Rate) × 100
  const cancellationRate =
    totalTrades > 0 ? (cancelledTrades / totalTrades) * 100 : 0;
  const inverseCancellationRate = 100 - cancellationRate;

  // Factor 6: Recent Performance
  // Success rate of the last N trades (sliding window)
  const recentPerformance = calculateRecentPerformance(
    trades,
    prospectiveTrade,
  );

  // Factor 7: Verified Trade Score
  // Ratio of inspected trades to total trades
  const verifiedTradeScore =
    totalTrades > 0 ? (inspectedTrades / totalTrades) * 100 : 0;

  // ----------------------------------------------------------
  // 7. APPLY WEIGHTED FORMULA
  // ----------------------------------------------------------

  const trustScore =
    WEIGHT_SUCCESSFUL_TRADE_RATE * successfulTradeRate +
    WEIGHT_ON_TIME_DELIVERY_RATE * onTimeDeliveryRate +
    WEIGHT_QUALITY_PASS_RATE * qualityPassRate +
    WEIGHT_DISPUTE_RATE * inverseDisputeRate +
    WEIGHT_CANCELLATION_RATE * inverseCancellationRate +
    WEIGHT_RECENT_PERFORMANCE * recentPerformance +
    WEIGHT_VERIFIED_TRADE_SCORE * verifiedTradeScore;

  // Clamp to 0-100 and round to nearest integer
  return Math.round(Math.max(0, Math.min(100, trustScore)));
}

// ============================================================
// RECENT PERFORMANCE (SLIDING WINDOW)
// ============================================================
// Takes the last N trades + the prospective trade,
// and computes their success rate (COMPLETED / total).

function calculateRecentPerformance(
  existingTrades: Array<{
    tradeStatus: string;
    timestamp: bigint;
  }>,
  prospectiveTrade: ProspectiveTrade,
): number {
  // Sort by timestamp descending (most recent first)
  const sorted = [...existingTrades].sort((a, b) =>
    a.timestamp > b.timestamp ? -1 : 1,
  );

  // Take the last N-1 existing trades (leaving room for the prospective trade)
  const recentExisting = sorted.slice(0, RECENT_TRADES_WINDOW - 1);

  // Build the recent window: prospective trade + recent existing
  let completedInWindow = 0;
  let totalInWindow = 1; // Start with 1 for the prospective trade

  if (prospectiveTrade.tradeStatus.trim().toUpperCase() === "COMPLETED") {
    completedInWindow++;
  }

  for (const trade of recentExisting) {
    totalInWindow++;
    if (trade.tradeStatus.trim().toUpperCase() === "COMPLETED") {
      completedInWindow++;
    }
  }

  return totalInWindow > 0 ? (completedInWindow / totalInWindow) * 100 : 0;
}

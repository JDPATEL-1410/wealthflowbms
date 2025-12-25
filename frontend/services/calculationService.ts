
import { BrokerageTransaction, PayoutBreakdown, SharingConfig, TransactionStatus } from "../types";

/**
 * Calculates the payout distribution based on specific business rules.
 * Example: 100 Gross -> 15% Expense (15) = 85 Net Pool.
 * Net Pool (85) is then the base for level distributions (e.g., 15% of 85).
 */
export const calculatePayout = (gross: number, config: SharingConfig): PayoutBreakdown => {
  // 1. Calculate Company Expense (e.g. 15% of Gross)
  const expenseAmount = Math.round((gross * (config.companyExpensePct / 100)) * 100) / 100;
  
  // 2. Determine Net Pool (the "New 100%")
  const netPool = Math.round((gross - expenseAmount) * 100) / 100;

  // 3. Distribute Net Pool across 7 layers
  const payouts: any = {};
  let distributedTotal = 0;

  // We calculate Levels 0, 2, 3, 4, 5, 6 normally.
  // Level 1 (Corporate House) usually acts as the balancer for rounding to ensure 100% distribution.
  const levelsToCalculate = [0, 2, 3, 4, 5, 6];

  levelsToCalculate.forEach(lvl => {
    const pct = config.levels[lvl as keyof typeof config.levels] || 0;
    // Calculate share of the Net Pool
    const amount = Math.floor((netPool * (pct / 100)) * 100) / 100;
    payouts[lvl] = amount;
    distributedTotal += amount;
  });

  // Level 1 gets the remainder of the Net Pool
  const lvl1Pct = config.levels[1] || 0;
  // We check if it's the last level or if we should just calculate it. 
  // For safety in financial reconciliation, Level 1 absorbs the decimal variance.
  payouts[1] = Math.round((netPool - distributedTotal) * 100) / 100;

  return {
    gross,
    expenseAmount,
    netPool,
    levelPayouts: {
      0: payouts[0] || 0,
      1: payouts[1] || 0,
      2: payouts[2] || 0,
      3: payouts[3] || 0,
      4: payouts[4] || 0,
      5: payouts[5] || 0,
      6: payouts[6] || 0,
    }
  };
};

export const runBatchCalculation = (
  transactions: BrokerageTransaction[], 
  config: SharingConfig
): BrokerageTransaction[] => {
  return transactions.map(tx => {
    if (!tx.mappedClientId) return tx;
    const breakdown = calculatePayout(tx.grossAmount, config);
    return {
      ...tx,
      breakdown,
      status: TransactionStatus.VALIDATED
    };
  });
};

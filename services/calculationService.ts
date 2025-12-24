import { BrokerageTransaction, PayoutBreakdown, SharingConfig, TransactionStatus } from "../types";

/**
 * Calculates the payout distribution based on the core business rules.
 * 1. Gross - Expense = NetPool
 * 2. NetPool distributed across 6 layers
 * 3. Rounding adjustments applied to Level 1
 */
export const calculatePayout = (gross: number, config: SharingConfig): PayoutBreakdown => {
  // 1. Calculate Company Expense
  const expenseAmount = Math.round((gross * (config.companyExpensePct / 100)) * 100) / 100;
  
  // 2. Determine Net Pool
  const netPool = Math.round((gross - expenseAmount) * 100) / 100;

  // 3. Distribute Net Pool
  const payouts: any = {};
  let distributedTotal = 0;

  // Levels 2-6 (Calculate normally)
  for (let i = 2; i <= 6; i++) {
    const pct = config.levels[i as keyof typeof config.levels];
    const amount = Math.floor((netPool * (pct / 100)) * 100) / 100; // Floor to 2 decimals to be safe
    payouts[i] = amount;
    distributedTotal += amount;
  }

  // Level 1 gets the remainder to handle rounding issues perfectly
  // (Or calculates normally and adds diff. Here we assign remainder for precision balance)
  const level1Pct = config.levels[1];
  const theoreticalL1 = (netPool * (level1Pct / 100));
  
  // Ensure sum equals NetPool exactly
  payouts[1] = Math.round((netPool - distributedTotal) * 100) / 100;

  return {
    gross,
    expenseAmount,
    netPool,
    levelPayouts: {
      1: payouts[1],
      2: payouts[2],
      3: payouts[3],
      4: payouts[4],
      5: payouts[5],
      6: payouts[6],
    }
  };
};

export const runBatchCalculation = (
  transactions: BrokerageTransaction[], 
  config: SharingConfig
): BrokerageTransaction[] => {
  return transactions.map(tx => {
    if (!tx.mappedClientId) return tx; // Skip unmapped
    
    const breakdown = calculatePayout(tx.grossAmount, config);
    return {
      ...tx,
      breakdown,
      status: TransactionStatus.VALIDATED
    };
  });
};
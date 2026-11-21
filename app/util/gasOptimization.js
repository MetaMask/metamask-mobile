/**
 * Advanced Gas Fee Optimization Utilities
 * 
 * This module provides intelligent gas fee optimization strategies
 * to help users save on transaction costs while maintaining reliability.
 * 
 * Features:
 * - Dynamic gas price recommendations based on network conditions
 * - Transaction urgency-based optimization
 * - Cost-saving strategies for batch transactions
 * - Network congestion analysis
 * 
 * @author Anthony Ogugua (CEO/CTO, trustBank)
 * @version 1.0.0
 */

import BigNumber from 'bignumber.js';

// Gas optimization constants
export const GAS_OPTIMIZATION_STRATEGIES = {
  ECONOMY: 'economy',     // Lowest cost, slower confirmation
  STANDARD: 'standard',   // Balanced cost and speed
  FAST: 'fast',          // Higher cost, faster confirmation
  URGENT: 'urgent'       // Highest cost, immediate confirmation
};

export const NETWORK_CONGESTION_LEVELS = {
  LOW: 'low',
  MODERATE: 'moderate', 
  HIGH: 'high',
  EXTREME: 'extreme'
};

/**
 * Analyzes current network congestion based on pending transactions
 * and recent gas prices to determine optimal fee strategy
 * 
 * @param {Object} networkData - Current network statistics
 * @param {number} networkData.pendingTransactions - Number of pending txs
 * @param {BigNumber} networkData.averageGasPrice - Recent average gas price
 * @param {BigNumber} networkData.medianGasPrice - Recent median gas price
 * @returns {string} Congestion level (low, moderate, high, extreme)
 */
export function analyzeNetworkCongestion(networkData) {
  const { pendingTransactions, averageGasPrice, medianGasPrice } = networkData;
  
  // Calculate gas price volatility indicator
  // Handle zero median gas price to prevent division by zero
  const priceVolatility = medianGasPrice.eq(0) 
    ? new BigNumber(0)
    : averageGasPrice.minus(medianGasPrice)
        .dividedBy(medianGasPrice)
        .abs();
  
  // Determine congestion level based on pending transactions and price volatility
  if (pendingTransactions > 50000 || priceVolatility.gt(0.5)) {
    return NETWORK_CONGESTION_LEVELS.EXTREME;
  } else if (pendingTransactions > 20000 || priceVolatility.gt(0.3)) {
    return NETWORK_CONGESTION_LEVELS.HIGH;
  } else if (pendingTransactions > 5000 || priceVolatility.gt(0.15)) {
    return NETWORK_CONGESTION_LEVELS.MODERATE;
  }
  
  return NETWORK_CONGESTION_LEVELS.LOW;
}

/**
 * Calculates optimal gas price based on user's urgency preference
 * and current network conditions
 * 
 * @param {string} strategy - User's preferred strategy (economy, standard, fast, urgent)
 * @param {string} congestionLevel - Current network congestion level
 * @param {BigNumber} baseGasPrice - Current base gas price from network
 * @param {BigNumber} priorityFee - Current priority fee
 * @returns {Object} Optimized gas configuration
 */
export function calculateOptimalGasPrice(strategy, congestionLevel, baseGasPrice, priorityFee) {
  const baseFee = new BigNumber(baseGasPrice);
  const currentPriorityFee = new BigNumber(priorityFee);
  
  // Define multipliers based on strategy and congestion
  const strategyMultipliers = {
    [GAS_OPTIMIZATION_STRATEGIES.ECONOMY]: {
      [NETWORK_CONGESTION_LEVELS.LOW]: { base: 1.0, priority: 0.8 },
      [NETWORK_CONGESTION_LEVELS.MODERATE]: { base: 1.1, priority: 0.9 },
      [NETWORK_CONGESTION_LEVELS.HIGH]: { base: 1.2, priority: 1.0 },
      [NETWORK_CONGESTION_LEVELS.EXTREME]: { base: 1.3, priority: 1.1 }
    },
    [GAS_OPTIMIZATION_STRATEGIES.STANDARD]: {
      [NETWORK_CONGESTION_LEVELS.LOW]: { base: 1.1, priority: 1.0 },
      [NETWORK_CONGESTION_LEVELS.MODERATE]: { base: 1.2, priority: 1.1 },
      [NETWORK_CONGESTION_LEVELS.HIGH]: { base: 1.3, priority: 1.2 },
      [NETWORK_CONGESTION_LEVELS.EXTREME]: { base: 1.5, priority: 1.4 }
    },
    [GAS_OPTIMIZATION_STRATEGIES.FAST]: {
      [NETWORK_CONGESTION_LEVELS.LOW]: { base: 1.2, priority: 1.3 },
      [NETWORK_CONGESTION_LEVELS.MODERATE]: { base: 1.4, priority: 1.5 },
      [NETWORK_CONGESTION_LEVELS.HIGH]: { base: 1.6, priority: 1.7 },
      [NETWORK_CONGESTION_LEVELS.EXTREME]: { base: 2.0, priority: 2.2 }
    },
    [GAS_OPTIMIZATION_STRATEGIES.URGENT]: {
      [NETWORK_CONGESTION_LEVELS.LOW]: { base: 1.5, priority: 1.8 },
      [NETWORK_CONGESTION_LEVELS.MODERATE]: { base: 1.8, priority: 2.2 },
      [NETWORK_CONGESTION_LEVELS.HIGH]: { base: 2.2, priority: 2.8 },
      [NETWORK_CONGESTION_LEVELS.EXTREME]: { base: 3.0, priority: 4.0 }
    }
  };
  
  const multipliers = strategyMultipliers[strategy][congestionLevel];
  
  const optimizedMaxFeePerGas = baseFee
    .multipliedBy(multipliers.base)
    .plus(currentPriorityFee.multipliedBy(multipliers.priority));
    
  const optimizedMaxPriorityFeePerGas = currentPriorityFee
    .multipliedBy(multipliers.priority);
  
  return {
    maxFeePerGas: optimizedMaxFeePerGas,
    maxPriorityFeePerGas: optimizedMaxPriorityFeePerGas,
    estimatedConfirmationTime: getEstimatedConfirmationTime(strategy, congestionLevel),
    potentialSavings: calculatePotentialSavings(baseFee, currentPriorityFee, optimizedMaxFeePerGas)
  };
}

/**
 * Estimates transaction confirmation time based on strategy and network conditions
 * 
 * @param {string} strategy - Gas optimization strategy
 * @param {string} congestionLevel - Network congestion level
 * @returns {number} Estimated confirmation time in seconds
 */
function getEstimatedConfirmationTime(strategy, congestionLevel) {
  const timeEstimates = {
    [GAS_OPTIMIZATION_STRATEGIES.ECONOMY]: {
      [NETWORK_CONGESTION_LEVELS.LOW]: 60,      // 1 minute
      [NETWORK_CONGESTION_LEVELS.MODERATE]: 180, // 3 minutes
      [NETWORK_CONGESTION_LEVELS.HIGH]: 300,    // 5 minutes
      [NETWORK_CONGESTION_LEVELS.EXTREME]: 600  // 10 minutes
    },
    [GAS_OPTIMIZATION_STRATEGIES.STANDARD]: {
      [NETWORK_CONGESTION_LEVELS.LOW]: 30,      // 30 seconds
      [NETWORK_CONGESTION_LEVELS.MODERATE]: 60, // 1 minute
      [NETWORK_CONGESTION_LEVELS.HIGH]: 120,    // 2 minutes
      [NETWORK_CONGESTION_LEVELS.EXTREME]: 300  // 5 minutes
    },
    [GAS_OPTIMIZATION_STRATEGIES.FAST]: {
      [NETWORK_CONGESTION_LEVELS.LOW]: 15,      // 15 seconds
      [NETWORK_CONGESTION_LEVELS.MODERATE]: 30, // 30 seconds
      [NETWORK_CONGESTION_LEVELS.HIGH]: 60,     // 1 minute
      [NETWORK_CONGESTION_LEVELS.EXTREME]: 120  // 2 minutes
    },
    [GAS_OPTIMIZATION_STRATEGIES.URGENT]: {
      [NETWORK_CONGESTION_LEVELS.LOW]: 5,       // 5 seconds
      [NETWORK_CONGESTION_LEVELS.MODERATE]: 15, // 15 seconds
      [NETWORK_CONGESTION_LEVELS.HIGH]: 30,     // 30 seconds
      [NETWORK_CONGESTION_LEVELS.EXTREME]: 60   // 1 minute
    }
  };
  
  return timeEstimates[strategy][congestionLevel];
}

/**
 * Calculates potential savings compared to a naive high gas price approach
 * 
 * @param {BigNumber} baseFee - Current base fee
 * @param {BigNumber} priorityFee - Current priority fee
 * @param {BigNumber} optimizedFee - Our optimized fee
 * @returns {Object} Savings information
 */
function calculatePotentialSavings(baseFee, priorityFee, optimizedFee) {
  // Assume naive approach uses 2x current fees
  const naiveApproachFee = baseFee.plus(priorityFee).multipliedBy(2);
  const savings = naiveApproachFee.minus(optimizedFee);
  
  // Handle zero naive approach fee to prevent division by zero
  const savingsPercentage = naiveApproachFee.eq(0) 
    ? new BigNumber(0)
    : savings.dividedBy(naiveApproachFee).multipliedBy(100);
  
  return {
    absoluteSavings: savings.gt(0) ? savings : new BigNumber(0),
    percentageSavings: savingsPercentage.gt(0) ? savingsPercentage : new BigNumber(0),
    isOptimized: savings.gt(0)
  };
}

/**
 * Suggests transaction batching opportunities for multiple operations
 * This is particularly useful for DeFi operations and token transfers
 * 
 * @param {Array} pendingTransactions - Array of pending transaction objects
 * @returns {Object} Batching recommendations
 */
export function suggestTransactionBatching(pendingTransactions) {
  const batchableTransactions = [];
  const recommendations = [];
  
  // Group transactions by recipient and token type
  const groupedTransactions = pendingTransactions.reduce((groups, tx) => {
    const key = `${tx.to}_${tx.data ? 'contract' : 'transfer'}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(tx);
    return groups;
  }, {});
  
  // Identify batching opportunities
  Object.entries(groupedTransactions).forEach(([key, transactions]) => {
    if (transactions.length > 1) {
      const totalGasSavings = calculateBatchGasSavings(transactions);
      
      if (totalGasSavings.gt(0)) {
        recommendations.push({
          transactionIds: transactions.map(tx => tx.id),
          estimatedSavings: totalGasSavings,
          batchType: key.includes('contract') ? 'contract_interaction' : 'token_transfer',
          recommendedAction: 'batch_transactions'
        });
      }
    }
  });
  
  return {
    hasBatchingOpportunities: recommendations.length > 0,
    recommendations,
    totalPotentialSavings: recommendations.reduce(
      (total, rec) => total.plus(rec.estimatedSavings), 
      new BigNumber(0)
    )
  };
}

/**
 * Calculates gas savings from batching multiple transactions
 * 
 * @param {Array} transactions - Transactions to batch
 * @returns {BigNumber} Estimated gas savings
 */
function calculateBatchGasSavings(transactions) {
  const individualGasCost = transactions.reduce(
    (total, tx) => total.plus(new BigNumber(tx.gasLimit || 21000)), 
    new BigNumber(0)
  );
  
  // Batched transactions typically save ~30% on gas due to shared overhead
  const batchedGasCost = individualGasCost.multipliedBy(0.7);
  
  return individualGasCost.minus(batchedGasCost);
}

/**
 * Provides user-friendly gas optimization recommendations
 * 
 * @param {Object} transactionContext - Context about the transaction
 * @returns {Object} User-friendly recommendations
 */
export function getGasOptimizationRecommendations(transactionContext) {
  const { urgency, transactionType, networkConditions, userPreferences } = transactionContext || {};
  
  const recommendations = [];
  
  // Add urgency-based recommendations
  if (urgency === 'low' && networkConditions?.congestion === NETWORK_CONGESTION_LEVELS.HIGH) {
    recommendations.push({
      type: 'timing',
      message: 'Network is congested. Consider waiting 1-2 hours for lower fees.',
      potentialSavings: '20-40%'
    });
  }
  
  // Add transaction-type specific recommendations
  if (transactionType === 'token_transfer' && userPreferences?.costSensitive) {
    recommendations.push({
      type: 'strategy',
      message: 'Use Economy mode for token transfers to minimize costs.',
      potentialSavings: '15-25%'
    });
  }
  
  return recommendations;
}
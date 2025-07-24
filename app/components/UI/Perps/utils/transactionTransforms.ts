import type { PerpsTransaction } from '../Views/PerpsTransactionsView/PerpsTransactionsView';

/**
 * Transform HyperLiquid userFills response to PerpsTransaction format
 * @param fills - Array of fill objects from HyperLiquid userFills API
 * @returns Array of PerpsTransaction objects
 */
export function transformFillsToTransactions(fills: any[]): PerpsTransaction[] {
  return fills.map((fill) => {
    const isPositive = fill.side === 'B'; // 'B' = sell = closing position = potentially positive
    const amount = `${fill.side === 'A' ? '+' : '-'}${fill.sz} ${fill.coin}`;
    const amountUSD = `${fill.side === 'A' ? '-' : '+'}$${(parseFloat(fill.sz) * parseFloat(fill.px)).toFixed(2)}`;
    
    return {
      id: fill.oid?.toString() || `fill-${fill.time}`,
      type: 'trade' as const,
      category: fill.side === 'A' ? 'position_open' : 'position_close',
      title: `${fill.side === 'A' ? 'Bought' : 'Sold'} ${fill.coin}`,
      status: 'Completed' as const,
      timestamp: fill.time,
      amount,
      amountUSD,
      asset: fill.coin,
      isPositive,
    };
  });
}

/**
 * Transform HyperLiquid historicalOrders response to PerpsTransaction format
 * @param orders - Array of order objects from HyperLiquid historicalOrders API
 * @returns Array of PerpsTransaction objects
 */
export function transformOrdersToTransactions(orders: any[]): PerpsTransaction[] {
  return orders.map((order) => {
    const isLimitOrder = order.orderType === 'limit';
    const isCancelled = order.status === 'cancelled';
    const isCompleted = order.status === 'filled';
    
    let title = '';
    let status: 'Completed' | 'Placed' | 'Queued' = 'Placed';
    
    if (isCancelled) {
      title = `Canceled ${order.coin} ${order.side === 'A' ? 'Long' : 'Short'} ${isLimitOrder ? 'limit order' : 'order'}`;
      status = 'Completed';
    } else if (isCompleted) {
      title = `${isLimitOrder ? 'Filled' : 'Executed'} ${order.coin} ${order.side === 'A' ? 'Long' : 'Short'} order`;
      status = 'Completed';
    } else {
      title = `Placed ${order.coin} ${order.side === 'A' ? 'Long' : 'Short'} ${isLimitOrder ? 'limit order' : 'order'}`;
      status = order.status === 'open' ? 'Placed' : 'Queued';
    }
    
    return {
      id: order.oid?.toString() || `order-${order.timestamp}`,
      type: 'order' as const,
      category: 'limit_order' as const,
      title,
      status,
      timestamp: order.timestamp,
      amount: '', // Orders don't have amounts until filled
      amountUSD: '',
      asset: order.coin,
      leverage: order.leverage ? `${order.leverage}x` : undefined,
      isPositive: false,
    };
  });
}

/**
 * Transform HyperLiquid userFunding response to PerpsTransaction format
 * @param funding - Array of funding objects from HyperLiquid userFunding API
 * @returns Array of PerpsTransaction objects
 */
export function transformFundingToTransactions(funding: any[]): PerpsTransaction[] {
  return funding.map((fundingItem) => {
    const isPositive = parseFloat(fundingItem.delta) > 0;
    const amount = `${isPositive ? '+' : ''}${fundingItem.delta} ${fundingItem.coin}`;
    const amountUSD = `${isPositive ? '+' : ''}$${Math.abs(parseFloat(fundingItem.delta)).toFixed(5)}`;
    
    return {
      id: `funding-${fundingItem.time}-${fundingItem.coin}`,
      type: 'funding' as const,
      category: 'funding_fee' as const,
      title: `${isPositive ? 'Received' : 'Paid'} funding fee`,
      status: 'Completed' as const,
      timestamp: fundingItem.time,
      amount,
      amountUSD,
      asset: fundingItem.coin,
      isPositive,
    };
  });
}

/**
 * Transform HyperLiquid userNonFundingLedgerUpdates response to PerpsTransaction format
 * @param ledgerUpdates - Array of ledger update objects from HyperLiquid userNonFundingLedgerUpdates API
 * @returns Array of PerpsTransaction objects
 */
export function transformLedgerUpdatesToTransactions(ledgerUpdates: any[]): PerpsTransaction[] {
  return ledgerUpdates.map((update) => {
    const isPositive = parseFloat(update.delta) > 0;
    const amount = `${isPositive ? '+' : ''}${update.delta} ${update.coin}`;
    const amountUSD = `${isPositive ? '+' : ''}$${Math.abs(parseFloat(update.delta)).toFixed(2)}`;
    
    let title = '';
    let type: 'trade' | 'order' | 'funding' = 'funding';
    let category: 'position_open' | 'position_close' | 'limit_order' | 'funding_fee' = 'funding_fee';
    
    // Determine transaction type based on update type
    if (update.type === 'deposit') {
      title = 'Deposit';
      type = 'funding';
      category = 'funding_fee';
    } else if (update.type === 'withdrawal') {
      title = 'Withdrawal';
      type = 'funding';
      category = 'funding_fee';
    } else if (update.type === 'liquidation') {
      title = 'Liquidation';
      type = 'trade';
      category = 'position_close';
    } else {
      title = 'Account update';
      type = 'funding';
      category = 'funding_fee';
    }
    
    return {
      id: `ledger-${update.time}-${update.coin}`,
      type,
      category,
      title,
      status: 'Completed' as const,
      timestamp: update.time,
      amount,
      amountUSD,
      asset: update.coin,
      isPositive,
    };
  });
}

/**
 * Combine and sort all transaction types chronologically
 * @param fills - Transformed fills
 * @param orders - Transformed orders
 * @param funding - Transformed funding
 * @returns Combined and sorted PerpsTransaction array
 */
export function combineAndSortTransactions(
  fills: PerpsTransaction[],
  orders: PerpsTransaction[],
  funding: PerpsTransaction[]
): PerpsTransaction[] {
  const allTransactions = [...fills, ...orders, ...funding];
  
  // Sort by timestamp descending (newest first)
  return allTransactions.sort((a, b) => b.timestamp - a.timestamp);
}
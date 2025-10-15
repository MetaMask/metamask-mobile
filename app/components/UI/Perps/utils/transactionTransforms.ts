import { BigNumber } from 'bignumber.js';
import {
  Funding,
  Order,
  OrderFill,
  UserHistoryItem,
} from '../controllers/types';
import {
  PerpsOrderTransactionStatus,
  PerpsOrderTransactionStatusType,
  PerpsTransaction,
} from '../types/transactionHistory';

export interface WithdrawalRequest {
  id: string;
  timestamp: number;
  amount: string;
  asset: string;
  txHash?: string;
  status: 'pending' | 'bridging' | 'completed' | 'failed';
  destination?: string;
  withdrawalId?: string;
}

export interface DepositRequest {
  id: string;
  timestamp: number;
  amount: string;
  asset: string;
  txHash?: string;
  status: 'pending' | 'bridging' | 'completed' | 'failed';
  source?: string;
  depositId?: string;
}

/**
 * Transform abstract OrderFill objects to PerpsTransaction format
 * @param fills - Array of abstract OrderFill objects
 * @returns Array of PerpsTransaction objects
 */
export function transformFillsToTransactions(
  fills: OrderFill[],
): PerpsTransaction[] {
  return fills.reduce((acc: PerpsTransaction[], fill) => {
    const {
      direction,
      orderId,
      symbol,
      size,
      price,
      fee,
      timestamp,
      feeToken,
      pnl,
      liquidation,
      detailedOrderType,
    } = fill;
    const [part1, part2] = direction ? direction.split(' ') : [];
    const isOpened = part1 === 'Open';
    const isClosed = part1 === 'Close';
    const isFlipped = part2 === '>';

    let action = '';
    let isPositive = false;
    if (isOpened) {
      action = 'Opened';
      // Will be set based on fee calculation below
    } else if (isClosed) {
      action = 'Closed';
      // Will be set based on PnL calculation below
    } else if (isFlipped) {
      action = 'Flipped';
      // Will be set based on calculation below
    } else if (!direction) {
      console.error('Unknown fill direction', fill);
      return acc;
    } else {
      console.error('Unknown action', fill);
      return acc;
    }

    let amountBN = BigNumber(0);
    let displayAmount = '';
    let fillSize = size;
    if (isFlipped) {
      fillSize = BigNumber(fill.startPosition || '0')
        .minus(fill.size)
        .absoluteValue()
        .toString();
    }
    // Calculate display amount based on action type
    if (isOpened) {
      // For opening positions: show fee paid (negative)
      amountBN = BigNumber(fill.fee || 0);
      displayAmount = `-$${Math.abs(amountBN.toNumber()).toFixed(2)}`;
      isPositive = false; // Fee is always a cost
    } else if (isClosed || isFlipped) {
      // For closing positions: show PnL minus fee
      const pnlValue = BigNumber(fill.pnl || 0);
      const feeValue = BigNumber(fill.fee || 0);
      amountBN = pnlValue.minus(feeValue);
      const netPnL = amountBN.toNumber();
      // For display, show + for positive, - for negative, nothing for 0
      if (netPnL > 0) {
        displayAmount = `+$${Math.abs(netPnL).toFixed(2)}`;
        isPositive = true;
      } else if (netPnL < 0) {
        displayAmount = `-$${Math.abs(netPnL).toFixed(2)}`;
        isPositive = false;
      } else {
        displayAmount = `$${Math.abs(netPnL).toFixed(2)}`;
        isPositive = true; // Treat break-even as positive (green)
      }
    } else {
      // Fallback: show order size value
      amountBN = BigNumber(fill.size).times(fill.price);
      displayAmount = `$${Math.abs(amountBN.toNumber()).toFixed(2)}`;
      isPositive = false; // Default to false for unknown cases
    }

    const isLiquidation = Boolean(liquidation);
    const isTakeProfit = Boolean(detailedOrderType?.includes('Take Profit'));
    const isStopLoss = Boolean(detailedOrderType?.includes('Stop'));

    acc.push({
      id: orderId || `fill-${timestamp}`,
      type: 'trade',
      category: isOpened ? 'position_open' : 'position_close',
      title: `${action} ${
        isFlipped ? direction?.toLowerCase() || '' : part2?.toLowerCase() || ''
      }`,
      subtitle: `${size} ${symbol}`,
      timestamp,
      asset: symbol,
      fill: {
        shortTitle: `${action} ${
          isFlipped
            ? direction?.toLowerCase() || ''
            : part2?.toLowerCase() || ''
        }`,
        // this is the amount that is displayed in the transaction view for what has been spent/gained
        // it may be the fee spent or the pnl depending on the case
        amount: displayAmount,
        amountNumber: parseFloat(amountBN.toFixed(2)),
        isPositive,
        size: fillSize,
        entryPrice: price,
        pnl,
        fee,
        points: '0', // Points feature not activated yet
        feeToken,
        action,
        liquidation,
        isLiquidation,
        isTakeProfit,
        isStopLoss,
      },
    });
    return acc;
  }, []);
}

/**
 * Transform abstract Order objects to PerpsTransaction format
 * @param orders - Array of abstract Order objects
 * @returns Array of PerpsTransaction objects
 */
export function transformOrdersToTransactions(
  orders: Order[],
): PerpsTransaction[] {
  return orders.map((order) => {
    const {
      orderId,
      symbol,
      side,
      orderType,
      size,
      originalSize,
      price,
      status,
      timestamp,
    } = order;

    const isCancelled = status === 'canceled';
    const isCompleted = status === 'filled';
    const isOpened = status === 'open';
    const isRejected = status === 'rejected';
    const isTriggered = status === 'triggered';

    const title = `${side === 'buy' ? 'Long' : 'Short'} ${orderType}`;
    const subtitle = `${originalSize || '0'} ${symbol}`;

    const orderTypeSlug = orderType.toLowerCase().split(' ').join('_');

    let orderStatusType: PerpsOrderTransactionStatusType =
      PerpsOrderTransactionStatusType.Pending;
    let statusText = PerpsOrderTransactionStatus.Queued;

    if (isCompleted) {
      orderStatusType = PerpsOrderTransactionStatusType.Filled;
      statusText = PerpsOrderTransactionStatus.Filled;
    } else if (isCancelled) {
      orderStatusType = PerpsOrderTransactionStatusType.Canceled;
      statusText = PerpsOrderTransactionStatus.Canceled;
    } else if (isRejected) {
      orderStatusType = PerpsOrderTransactionStatusType.Canceled; // Map rejected to canceled
      statusText = PerpsOrderTransactionStatus.Rejected;
    } else if (isTriggered) {
      orderStatusType = PerpsOrderTransactionStatusType.Filled; // Map triggered to filled
      statusText = PerpsOrderTransactionStatus.Triggered;
    } else {
      orderStatusType = PerpsOrderTransactionStatusType.Pending;
      statusText = isOpened
        ? PerpsOrderTransactionStatus.Open
        : PerpsOrderTransactionStatus.Queued;
    }

    // Calculate filled percentage from abstract types
    const filledPercent = BigNumber(size).isEqualTo(0)
      ? '100'
      : BigNumber(originalSize)
          .minus(size)
          .dividedBy(originalSize)
          .absoluteValue()
          .multipliedBy(100)
          .toString();

    return {
      id: `${orderId}-${timestamp}`,
      type: 'order',
      category: 'limit_order',
      title,
      subtitle,
      timestamp,
      asset: symbol,
      order: {
        text: statusText,
        statusType: orderStatusType,
        type: orderTypeSlug.includes('limit') ? 'limit' : 'market',
        size: BigNumber(originalSize).multipliedBy(price).toString(),
        limitPrice: price,
        filled: `${filledPercent}%`,
      },
    };
  });
}

/**
 * Transform abstract Funding objects to PerpsTransaction format
 * @param funding - Array of abstract Funding objects
 * @returns Array of PerpsTransaction objects sorted by timestamp (newest first)
 */
export function transformFundingToTransactions(
  funding: Funding[],
): PerpsTransaction[] {
  // Sort funding by timestamp in descending order (newest first) to match Orders and Trades
  const sortedFunding = [...funding].sort((a, b) => b.timestamp - a.timestamp);

  return sortedFunding.map((fundingItem) => {
    const { symbol, amountUsd, rate, timestamp } = fundingItem;

    // Create safe amount strings
    const isPositive = BigNumber(amountUsd).isGreaterThan(0);
    const amountUSDC = `${isPositive ? '+' : '-'}$${BigNumber(amountUsd)
      .absoluteValue()
      .toString()}`;

    return {
      id: `funding-${timestamp}-${symbol}`,
      type: 'funding',
      category: 'funding_fee',
      title: `${isPositive ? 'Received' : 'Paid'} funding fee`,
      subtitle: symbol,
      timestamp,
      asset: symbol,
      fundingAmount: {
        isPositive,
        fee: amountUSDC,
        feeNumber: parseFloat(amountUsd),
        rate: `${BigNumber(rate).multipliedBy(100).toString()}%`,
      },
    };
  });
}

/**
 * Transform UserHistoryItem objects to PerpsTransaction format
 * Only shows completed deposits/withdrawals (txHash not displayed in UI)
 * @param userHistory - Array of UserHistoryItem objects (deposits/withdrawals)
 * @returns Array of PerpsTransaction objects
 */
export function transformUserHistoryToTransactions(
  userHistory: UserHistoryItem[],
): PerpsTransaction[] {
  return userHistory
    .filter((item) => item.status === 'completed')
    .map((item) => {
      const { id, timestamp, type, amount, asset, txHash, status } = item;

      const isDeposit = type === 'deposit';

      // Format amount with appropriate sign
      const amountBN = BigNumber(amount);
      const displayAmount = `${isDeposit ? '+' : '-'}$${amountBN.toFixed(2)}`;

      // For completed transactions, status is always positive (green)
      const statusText = 'Completed';

      return {
        id: `${type}-${id}`,
        type: isDeposit ? 'deposit' : 'withdrawal',
        category: isDeposit ? 'deposit' : 'withdrawal',
        title: `${isDeposit ? 'Deposited' : 'Withdrew'} ${amount} ${asset}`,
        subtitle: statusText,
        timestamp,
        asset,
        depositWithdrawal: {
          amount: displayAmount,
          amountNumber: amountBN.toNumber(),
          isPositive: isDeposit,
          asset,
          txHash: txHash || '',
          status,
          type: isDeposit ? 'deposit' : 'withdrawal',
        },
      };
    });
}

/**
 * Transform WithdrawalRequest objects to PerpsTransaction format
 * Only shows completed withdrawals (txHash not displayed in UI)
 * @param withdrawalRequests - Array of WithdrawalRequest objects
 * @returns Array of PerpsTransaction objects
 */
export function transformWithdrawalRequestsToTransactions(
  withdrawalRequests: WithdrawalRequest[],
): PerpsTransaction[] {
  return withdrawalRequests
    .filter((request) => request.status === 'completed')
    .map((request) => {
      const { id, timestamp, amount, asset, txHash, status } = request;

      // Format amount with negative sign for withdrawals
      const amountBN = BigNumber(amount);
      const displayAmount = `-$${amountBN.toFixed(2)}`;

      // For completed withdrawals, status is always positive (green)
      const statusText = 'Completed';
      const isPositive = true;

      return {
        id: `withdrawal-${id}`,
        type: 'withdrawal',
        category: 'withdrawal',
        title: `Withdrew ${amount} ${asset}`,
        subtitle: statusText,
        timestamp,
        asset,
        depositWithdrawal: {
          amount: displayAmount,
          amountNumber: -amountBN.toNumber(), // Negative for withdrawals
          isPositive,
          asset,
          txHash: txHash || '',
          status,
          type: 'withdrawal',
        },
      };
    });
}

/**
 * Transform DepositRequest objects to PerpsTransaction format
 * Only shows completed deposits (txHash not displayed in UI)
 * @param depositRequests - Array of DepositRequest objects
 * @returns Array of PerpsTransaction objects
 */
export function transformDepositRequestsToTransactions(
  depositRequests: DepositRequest[],
): PerpsTransaction[] {
  return depositRequests
    .filter((request) => request.status === 'completed')
    .map((request) => {
      const { id, timestamp, amount, asset, txHash, status } = request;

      // Format amount with positive sign for deposits
      const amountBN = BigNumber(amount);
      const displayAmount = `+$${amountBN.toFixed(2)}`;

      // For completed deposits, status is always positive (green)
      const statusText = 'Completed';
      const isPositive = true;

      // Create title based on whether we have the actual amount
      const title =
        amount === '0' || amount === '0.00'
          ? 'Deposit'
          : `Deposited ${amount} ${asset}`;

      return {
        id: `deposit-${id}`,
        type: 'deposit',
        category: 'deposit',
        title,
        subtitle: statusText,
        timestamp,
        asset,
        depositWithdrawal: {
          amount: displayAmount,
          amountNumber: amountBN.toNumber(),
          isPositive,
          asset,
          txHash: txHash || '',
          status,
          type: 'deposit',
        },
      };
    });
}

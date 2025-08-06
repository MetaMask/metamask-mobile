import { BigNumber } from 'bignumber.js';
import { Funding, Order, OrderFill } from '../controllers/types';
import {
  PerpsOrderTransactionStatus,
  PerpsOrderTransactionStatusType,
  PerpsTransaction,
} from '../types/transactionHistory';

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
    } = fill;

    const [part1, part2] = direction ? direction.split(' ') : [];
    const isOpened = part1 === 'Open';
    const isClosed = part1 === 'Close';
    const isFlipped = part2 === '>';

    let action = '';
    let isPositive = false;
    if (isOpened) {
      action = 'Opened';
      isPositive = false;
    } else if (isClosed) {
      action = 'Closed';
      isPositive = true;
    } else if (isFlipped) {
      action = 'Flipped';
      isPositive = true;
    } else if (!direction) {
      console.error('Unknown fill direction', fill);
      return acc;
    } else {
      console.error('Unknown action', fill);
      return acc;
    }

    let amount = 0;
    let amountBN = BigNumber(0);

    if (isFlipped) {
      amountBN = BigNumber(fill.startPosition || '0')
        .minus(fill.size)
        .times(fill.price);
    } else {
      amountBN = BigNumber(fill.size).times(fill.price).plus(fill.fee);
    }
    amount = amountBN.toNumber();

    const absAmount = Math.abs(amount).toFixed(2);
    const amountUSD = `${isPositive ? '+' : '-'}$${absAmount}`;

    acc.push({
      id: orderId || `fill-${timestamp}`,
      type: 'trade',
      category: isOpened ? 'position_open' : 'position_close',
      title: `${action} ${symbol} ${
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
        amount: amountUSD,
        amountNumber: parseFloat(amountBN.toFixed(2)),
        isPositive,
        size,
        entryPrice: price,
        pnl,
        fee,
        points: '0',
        feeToken,
        action,
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
 * @returns Array of PerpsTransaction objects
 */
export function transformFundingToTransactions(
  funding: Funding[],
): PerpsTransaction[] {
  return funding.map((fundingItem) => {
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
      subtitle: ``,
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

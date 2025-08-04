import { BigNumber } from 'bignumber.js';
import type { PerpsTransaction } from '../Views/PerpsTransactionsView/PerpsTransactionsView';
import { OrderFill } from '../controllers';
import { Funding, Order } from '../controllers/types';

/**
 * Transform abstract OrderFill objects to PerpsTransaction format
 * @param fills - Array of abstract OrderFill objects
 * @returns Array of PerpsTransaction objects
 */
export function transformFillsToTransactions(
  fills: OrderFill[],
): PerpsTransaction[] {
  return fills.map((fill) => {
    const {
      orderId,
      symbol,
      size,
      price,
      fee,
      timestamp,
      feeToken,
      direction,
      pnl,
    } = fill;
    // TODO: better logic handling for flipped fills, this feels brittle but will do for now
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
    } else {
      action = part1;
      isPositive = true;
    }

    let amount = '';
    if (isFlipped) {
      amount = `${isPositive ? '+' : '-'}${BigNumber(fill.startPosition || '0')
        .minus(fill.size)
        .absoluteValue()
        .times(fill.price)
        .toString()} ${fill.symbol}`;
    } else {
      amount = `${isPositive ? '+' : '-'}${BigNumber(fill.size)
        .times(fill.price)
        .plus(fill.fee)
        .toString()} ${fill.feeToken}`;
    }

    const absAmount = Math.abs(parseFloat(amount)).toFixed(2);
    const amountUSD = `${isPositive ? '+' : '-'}$${absAmount}`;

    return {
      id: orderId || `fill-${timestamp}`,
      type: 'trade' as const,
      category: isOpened ? 'position_open' : 'position_close',
      title: `${action} ${symbol} ${
        isFlipped ? direction?.toLowerCase() : part2?.toLowerCase()
      }`,
      subtitle: `${size} ${symbol}`,
      timestamp,
      asset: symbol,
      fill: {
        shortTitle: `${action} ${
          isFlipped ? direction?.toLowerCase() : part2?.toLowerCase()
        }`,
        amount: amountUSD,
        amountNumber: parseFloat(parseFloat(amount).toFixed(2)),
        isPositive,
        size,
        entryPrice: price,
        pnl,
        fee,
        points: '0',
        feeToken,
        action,
      },
    };
  });
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

    let orderStatusType: 'filled' | 'canceled' | 'pending' = 'pending';
    let statusText = '';

    if (isCompleted) {
      orderStatusType = 'filled';
      statusText = 'Filled';
    } else if (isCancelled) {
      orderStatusType = 'canceled';
      statusText = 'Canceled';
    } else if (isRejected) {
      orderStatusType = 'canceled'; // Map rejected to canceled
      statusText = 'Rejected';
    } else if (isTriggered) {
      orderStatusType = 'filled'; // Map triggered to filled
      statusText = 'Triggered';
    } else {
      orderStatusType = 'pending';
      statusText = isOpened ? '' : 'Queued';
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
      type: 'order' as const,
      category: 'limit_order' as const, // Fixed category
      title,
      subtitle,
      timestamp,
      asset: symbol,
      order: {
        text: statusText,
        statusType: orderStatusType,
        type: orderTypeSlug.includes('limit') ? 'limit' : 'market',
        size: BigNumber(originalSize).multipliedBy(price).toString(),
        limitPrice: parseFloat(price),
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
      type: 'funding' as const,
      category: 'funding_fee' as const,
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

import { BigNumber } from 'bignumber.js';
import type { PerpsTransaction } from '../Views/PerpsTransactionsView/PerpsTransactionsView';

/**
 * Transform HyperLiquid userFills response to PerpsTransaction format
 * @param fills - Array of fill objects from HyperLiquid userFills API
 * @returns Array of PerpsTransaction objects
 */
export function transformFillsToTransactions(fills: any[]): PerpsTransaction[] {
  return fills.map((fill) => {
    const {
      px,
      dir,
      feeToken,
      fee,
      startPosition,
      closedPnl,
      time,
      oid,
      coin,
    } = fill;
    // TODO: better logic handling for flipped fills, this feels brittle but will do for now
    const [part1, part2] = dir ? dir.split(' ') : [];
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
      action = 'Unknown';
      isPositive = true;
    }

    let amount = '';
    if (isFlipped) {
      amount = `${isPositive ? '+' : '-'}${BigNumber(fill.startPosition)
        .minus(fill.sz)
        .absoluteValue()
        .times(fill.px)
        .toString()} ${fill.coin}`;
    } else {
      amount = `${isPositive ? '+' : '-'}${BigNumber(fill.sz)
        .times(fill.px)
        .plus(fill.fee)
        .toString()} ${fill.feeToken}`;
    }

    const absAmount = Math.abs(parseFloat(amount)).toFixed(2);
    const amountUSD = `${isPositive ? '+' : '-'}$${absAmount}`;

    return {
      id: fill.oid?.toString() || `fill-${fill.time}`,
      type: 'trade' as const,
      category: isOpened ? 'position_open' : 'position_close',
      title: `${action} ${fill.coin} ${
        isFlipped ? fill.dir?.toLowerCase() : part2?.toLowerCase()
      }`,
      subtitle: `${fill.sz} ${fill.coin}`,
      timestamp: fill.time,
      asset: fill.coin,
      fill: {
        shortTitle: `${action} ${
          isFlipped ? fill.dir?.toLowerCase() : part2?.toLowerCase()
        }`,
        amount: amountUSD,
        amountNumber: parseFloat(amount).toFixed(2),
        isPositive,
        size: fill.sz,
        entryPrice: px,
        pnl: closedPnl,
        fee,
        feeToken,
        action,
      },
    };
  });
}

/**
 * Transform HyperLiquid historicalOrders response to PerpsTransaction format
 * @param orders - Array of order objects from HyperLiquid historicalOrders API
 * @returns Array of PerpsTransaction objects
 */
export function transformOrdersToTransactions(
  orders: any[],
): PerpsTransaction[] {
  return orders.map((orderObj) => {
    const { order, status, statusTimestamp } = orderObj;
    const { oid, coin, side, orderType, sz, origSz, limitPx } = order;

    // console.log('orderObj', orderObj);
    const isCancelled = [
      'canceled',
      'reduceOnlyCanceled',
      'siblingFilledCanceled',
    ].includes(status);
    const isCompleted = status === 'filled';
    const isOpened = status === 'open';
    const isRejected = status === 'minTradeNtlRejected';
    const isTriggered = status === 'triggered';

    const title = `${
      side === 'A' ? 'Long' : 'Short'
    } ${orderType?.toLowerCase()}`;
    const subtitle = `${origSz || '0'} ${coin}`;

    const orderTypeSlug = orderType?.toLowerCase().split(' ').join('_');

    let orderStatusType:
      | 'filled'
      | 'canceled'
      | 'rejected'
      | 'triggered'
      | 'pending' = 'pending';
    let statusText = '';

    if (isCompleted) {
      orderStatusType = 'filled';
      statusText = 'Filled';
    } else if (isCancelled) {
      orderStatusType = 'canceled';
      statusText = 'Canceled';
    } else if (isRejected) {
      orderStatusType = 'rejected';
      statusText = 'Rejected';
    } else if (isTriggered) {
      orderStatusType = 'triggered';
      statusText = 'Triggered';
    } else {
      orderStatusType = 'pending';
      statusText = isOpened ? '' : 'Queued';
    }

    return {
      id: `${oid?.toString()}-${statusTimestamp}`,
      type: 'order' as const,
      category: orderTypeSlug,
      title,
      subtitle,
      timestamp: statusTimestamp,
      asset: coin,
      order: {
        text: statusText,
        statusType: orderStatusType,
        type: orderTypeSlug.includes('limit') ? 'limit' : 'market',
        size: BigNumber(origSz).multipliedBy(limitPx).toString(),
        limitPrice: limitPx,
        filled: `${
          BigNumber(sz).isEqualTo(0)
            ? '100'
            : BigNumber(origSz)
                .minus(sz)
                .dividedBy(origSz)
                .absoluteValue()
                .multipliedBy(100)
                .toString()
        }%`,
      },
    };
  });
}

/**
 * Transform HyperLiquid userFunding response to PerpsTransaction format
 * @param funding - Array of funding objects from HyperLiquid userFunding API
 * @returns Array of PerpsTransaction objects
 */
export function transformFundingToTransactions(
  funding: any[],
): PerpsTransaction[] {
  return funding.map((fundingItem) => {
    // Add logging to debug the data structure
    // console.log('fundingItem', fundingItem);
    // Safe parsing with fallbacks
    const { delta, hash, time } = fundingItem;
    const { coin, fundingRate, szi, type, usdc, nSamples } = delta;

    // Create safe amount strings
    const isPositive = BigNumber(usdc).isGreaterThan(0);
    const amountUSDC = `${isPositive ? '+' : '-'}$${BigNumber(usdc)
      .absoluteValue()
      .toString()}`;

    return {
      id: `funding-${time}-${coin}`,
      type: 'funding' as const,
      category: 'funding_fee' as const,
      title: `${isPositive ? 'Received' : 'Paid'} funding fee`,
      subtitle: ``,
      timestamp: time,
      asset: coin,
      fundingAmount: {
        isPositive,
        fee: amountUSDC,
        feeNumber: BigNumber(usdc).toString(),
        rate: `${BigNumber(fundingRate).multipliedBy(100).toString()}%`,
      },
    };
  });
}

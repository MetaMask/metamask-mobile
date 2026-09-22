import { BigNumber } from 'bignumber.js';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { strings } from '../../../../../locales/i18n';
import {
  Funding,
  Order,
  OrderFill,
  UserHistoryItem,
  getPerpsDisplaySymbol,
  isLimitExecutionOrderType,
  isTriggerOrderType,
  type OrderType,
} from '@metamask/perps-controller';
import {
  FillType,
  PerpsOrderTransactionStatus,
  PerpsOrderTransactionStatusType,
  PerpsTransaction,
} from '../types/transactionHistory';
import {
  formatOrderLabel,
  getInlineOrderLabelDirection,
  getValidPerpsPrice,
  resolvePerpsTransactionOrderType,
} from './orderUtils';
import { getTokenTransferData } from '../../../Views/confirmations/utils/transaction-pay';
import { parseStandardTokenTransactionData } from '../../../Views/confirmations/utils/transaction';
import { calcTokenAmount } from '../../../../util/transactions';
import { ARBITRUM_USDC } from '../../../Views/confirmations/constants/perps';

/**
 * Determines the direction category for aggregation purposes.
 * Returns a normalized direction string for grouping fills that should be aggregated together.
 * Opens, closes and flips all qualify: a single order that HyperLiquid filled in several
 * pieces must be shown as one trade whichever way it moved the position.
 *
 * @param direction - The fill direction string (e.g., "Close Long", "Open Short", "Long > Short")
 * @returns A normalized direction for grouping, or null when the direction is unknown
 */
function getDirectionForAggregation(
  direction: string | undefined,
): string | null {
  if (!direction) return null;

  const [part1, part2] = direction.split(' ');

  // Handle standard open and close directions
  if (part1 === 'Open' || part1 === 'Close') {
    return `${part1} ${part2}`; // e.g. "Open Long" or "Close Short"
  }

  // Handle position flips, which HyperLiquid reports as "Long > Short"
  if (part2 === '>') {
    return direction;
  }

  // Handle spot-perps and prelaunch markets that use "Buy"/"Sell"
  if (direction === 'Buy' || direction === 'Sell') {
    return direction;
  }

  // Handle auto-deleveraging as a closeable position
  if (direction === 'Auto-Deleveraging') {
    return 'Auto-Deleveraging';
  }

  // Unknown direction - don't aggregate
  return null;
}

/**
 * Aggregates the fills belonging to one trade so a trade the user placed once is shown once.
 * HyperLiquid splits a single order across the book - over several price levels and, for larger
 * orders, over several seconds - and each piece comes back as its own fill.
 *
 * Fills are grouped when they share an asset and a direction category (Open Long, Close Short,
 * Long > Short, Buy, Sell, Auto-Deleveraging...) and the same order id, which covers an order
 * that filled across several price levels or several seconds.
 *
 * Close-category fills (Close Long/Short, Sell, Auto-Deleveraging) additionally group by the
 * second they landed in, because HyperLiquid splits a triggered TP/SL into several child orders
 * that fill together under different order ids. That cross-order rule is deliberately limited to
 * the close side: two separate opens on one market inside the same second are two trades, and
 * merging them would report a size the user never placed.
 *
 * For aggregated fills:
 * - Sizes are summed
 * - PnLs are summed
 * - Fees are summed
 * - Price is calculated as VWAP (Volume Weighted Average Price)
 * - Latest fill's orderId, timestamp and metadata are preserved
 * - startPosition is the position the order started from, chosen by pickOpeningPosition
 * - detailedOrderType (Stop Loss, Take Profit) is preserved from any grouped fill
 * - liquidation info is preserved from any grouped fill
 *
 * @param fills - Array of OrderFill objects to aggregate
 * @returns Array of OrderFill objects with each order's fills aggregated into one
 */
/**
 * Picks the position an order started from out of its fills.
 *
 * The fills of one order walk the position in a single direction, so the opening position is
 * the largest one any fill saw. It is picked by magnitude rather than by position in the list
 * because a book sweep gives every fill the same millisecond, which leaves the list in whatever
 * order history returned it.
 *
 * A flip is the exception: it names the side it opened from ("Long > Short"), and a fill that
 * has already crossed over reports the new position on the other side, which can be larger than
 * the one the order opened with. Those fills are skipped so flipping a small position into a
 * big one still reports the small one as the start.
 *
 * The original signed value is returned - auto-deleveraging reads its sign for the long/short
 * label.
 *
 * @param fills - The fills of a single aggregated order
 * @returns The signed startPosition the order opened from, or undefined when no fill carries one
 */
function pickOpeningPosition(fills: OrderFill[]): string | undefined {
  const [openingSide, flipMarker] = (fills[0]?.direction || '').split(' ');
  const isFlip = flipMarker === '>';

  let openingPosition: string | undefined;

  for (const fill of fills) {
    if (!fill.startPosition) {
      continue;
    }

    const startPosition = BigNumber(fill.startPosition);

    const stillOnOpeningSide =
      openingSide === 'Long'
        ? startPosition.isGreaterThan(0)
        : startPosition.isLessThan(0);
    if (isFlip && !stillOnOpeningSide) {
      continue;
    }

    if (
      openingPosition === undefined ||
      startPosition
        .absoluteValue()
        .isGreaterThan(BigNumber(openingPosition).absoluteValue())
    ) {
      openingPosition = fill.startPosition;
    }
  }

  return openingPosition;
}

export function aggregateFillsByOrder(fills: OrderFill[]): OrderFill[] {
  // Seed groups, keyed by the rule that may pull fills of different orders together
  const secondGroups: { bucket: string; fills: OrderFill[] }[] = [];
  const secondGroupByKey = new Map<
    string,
    { bucket: string; fills: OrderFill[] }
  >();
  // Array to preserve non-aggregatable fills in order
  const nonAggregatableFills: OrderFill[] = [];

  // Seed one group per order, except on the close side, where the same second is the
  // seed instead so a trigger order split into several child order ids stays together.
  for (const fill of fills) {
    const direction = getDirectionForAggregation(fill.direction);

    if (direction === null) {
      // Unknown direction - don't aggregate, preserve as-is
      nonAggregatableFills.push(fill);
      continue;
    }

    const bucket = `${fill.symbol}-${direction}`;
    const isCloseCategory =
      direction.startsWith('Close ') ||
      direction === 'Sell' ||
      direction === 'Auto-Deleveraging';
    const seedKey = isCloseCategory
      ? `${bucket}-second-${Math.floor(fill.timestamp / 1000)}`
      : `${bucket}-order-${fill.orderId || `solo-${fill.timestamp}`}`;

    const existingGroup = secondGroupByKey.get(seedKey);
    if (existingGroup) {
      existingGroup.fills.push(fill);
    } else {
      const group = { bucket, fills: [fill] };
      secondGroupByKey.set(seedKey, group);
      secondGroups.push(group);
    }
  }

  // Link the seed groups that share an order id, which merges the per-second close groups an
  // order filled over several seconds into the one trade the user placed. The union is
  // transitive, so close seeds can chain: X@s1, {X,Y}@s2, {Y,Z}@s3 end up as one entry even
  // though X and Z share no order id. Every hop still needs a same-second close collision,
  // which is the condition the pre-fix code already merged on, and order-seeded groups (opens,
  // buys, flips) cannot take part because each of those seeds holds a single order.
  const groupOwner = secondGroups.map((_group, index) => index);
  const resolveOwner = (index: number): number => {
    let owner = index;
    while (groupOwner[owner] !== owner) {
      owner = groupOwner[owner];
    }
    return owner;
  };

  const ownerByOrderKey = new Map<string, number>();
  secondGroups.forEach((group, index) => {
    for (const fill of group.fills) {
      if (!fill.orderId) {
        continue;
      }
      const orderKey = `${group.bucket}-${fill.orderId}`;
      const knownOwner = ownerByOrderKey.get(orderKey);
      if (knownOwner === undefined) {
        ownerByOrderKey.set(orderKey, resolveOwner(index));
      } else {
        groupOwner[resolveOwner(index)] = resolveOwner(knownOwner);
      }
    }
  });

  const aggregationMap = new Map<number, OrderFill[]>();
  secondGroups.forEach((group, index) => {
    const owner = resolveOwner(index);
    const owned = aggregationMap.get(owner);
    if (owned) {
      owned.push(...group.fills);
    } else {
      aggregationMap.set(owner, [...group.fills]);
    }
  });

  // Build aggregated fills
  const aggregatedFills: OrderFill[] = [];

  for (const groupedFills of aggregationMap.values()) {
    if (groupedFills.length === 1) {
      // Only one fill in the group - no aggregation needed
      aggregatedFills.push(groupedFills[0]);
      continue;
    }

    // Aggregate multiple fills. The latest fill stands in for the completed order, so the
    // row keeps its place in a history sorted newest first.
    const fillsOldestFirst = [...groupedFills].sort(
      (a, b) => a.timestamp - b.timestamp,
    );
    const latestFill = fillsOldestFirst[fillsOldestFirst.length - 1];

    // Sum sizes, PnLs, and fees
    let totalSize = BigNumber(0);
    let totalPnl = BigNumber(0);
    let totalFee = BigNumber(0);
    let totalNotional = BigNumber(0); // For VWAP calculation: sum of (size * price)

    // Preserve detailedOrderType and liquidation from any fill in the group
    let aggregatedDetailedOrderType: string | undefined;
    let aggregatedLiquidation: OrderFill['liquidation'];
    const aggregatedStartPosition = pickOpeningPosition(fillsOldestFirst);

    for (const fill of fillsOldestFirst) {
      const size = BigNumber(fill.size);
      const price = BigNumber(fill.price);
      const pnl = BigNumber(fill.pnl || '0');
      const fee = BigNumber(fill.fee || '0');

      totalSize = totalSize.plus(size);
      totalPnl = totalPnl.plus(pnl);
      totalFee = totalFee.plus(fee);
      totalNotional = totalNotional.plus(size.times(price));

      // Preserve detailedOrderType from any fill that has it
      if (fill.detailedOrderType && !aggregatedDetailedOrderType) {
        aggregatedDetailedOrderType = fill.detailedOrderType;
      }

      // Preserve liquidation info from any fill that has it
      if (fill.liquidation && !aggregatedLiquidation) {
        aggregatedLiquidation = fill.liquidation;
      }
    }

    // Calculate VWAP: totalNotional / totalSize
    const vwapPrice = totalSize.isZero()
      ? BigNumber(latestFill.price)
      : totalNotional.dividedBy(totalSize);

    // Create aggregated fill
    const aggregatedFill: OrderFill = {
      orderId: latestFill.orderId,
      symbol: latestFill.symbol,
      side: latestFill.side,
      size: totalSize.toString(),
      price: vwapPrice.toString(),
      pnl: totalPnl.toString(),
      direction: latestFill.direction,
      fee: totalFee.toString(),
      feeToken: latestFill.feeToken,
      timestamp: latestFill.timestamp, // Order is complete at its last fill
      startPosition: aggregatedStartPosition,
      success: latestFill.success,
      liquidation: aggregatedLiquidation,
      orderType: latestFill.orderType,
      detailedOrderType: aggregatedDetailedOrderType,
    };

    aggregatedFills.push(aggregatedFill);
  }

  // Combine aggregated and non-aggregatable fills, then sort by timestamp descending
  const allFills = [...aggregatedFills, ...nonAggregatableFills];
  allFills.sort((a, b) => b.timestamp - a.timestamp);

  return allFills;
}

/**
 * Merges REST and WebSocket fill arrays into a single deduplicated, sorted array.
 *
 * REST fills are added first; WS fills overwrite duplicates (fresher data).
 * When a WS fill lacks `detailedOrderType` or `liquidation` that the REST fill has,
 * the REST metadata is preserved so TP/SL pills remain visible on all screens.
 *
 * Dedup key: `orderId-timestamp-size-price`
 *
 * @param restFills - Historical fills from the REST API
 * @param liveFills - Real-time fills from the WebSocket
 * @returns Merged, deduplicated fills sorted by timestamp descending
 */
export function mergeOrderFills(
  restFills: OrderFill[],
  liveFills: OrderFill[],
): OrderFill[] {
  const fillsMap = new Map<string, OrderFill>();

  for (const fill of restFills) {
    const key = `${fill.orderId}-${fill.timestamp}-${fill.size}-${fill.price}`;
    fillsMap.set(key, fill);
  }

  for (const fill of liveFills) {
    const key = `${fill.orderId}-${fill.timestamp}-${fill.size}-${fill.price}`;
    const existing = fillsMap.get(key);
    if (existing?.detailedOrderType && !fill.detailedOrderType) {
      fillsMap.set(key, {
        ...fill,
        detailedOrderType: existing.detailedOrderType,
        ...(existing.liquidation &&
          !fill.liquidation && { liquidation: existing.liquidation }),
      });
    } else {
      fillsMap.set(key, fill);
    }
  }

  return Array.from(fillsMap.values()).sort(
    (a, b) => b.timestamp - a.timestamp,
  );
}

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
 * Builds the ids of the rows shown when aggregation is off.
 *
 * The provider-neutral `OrderFill` model carries no execution id yet (HyperLiquid's `tid` does
 * not reach it), so the id is derived from the fill's own content plus how many identical fills
 * precede it. Unlike an index into the rendered list, that leaves every existing id untouched
 * when a newer fill arrives, which keeps FlashList keys and Activity Details resolution stable
 * across a refresh. The `fill-` namespace keeps these ids clear of the aggregated rows, whose
 * id carries the last fill's orderId and timestamp.
 *
 * @param fills - The fills about to be turned into rows, in render order
 * @returns One id per fill, positionally aligned with `fills`
 */
function buildIndividualFillIds(fills: OrderFill[]): string[] {
  const occurrences = new Map<string, number>();

  return fills.map((fill) => {
    const key = `${fill.orderId || 'fill'}-${fill.timestamp}-${fill.size}-${
      fill.price
    }`;
    const occurrence = occurrences.get(key) ?? 0;
    occurrences.set(key, occurrence + 1);
    return `fill-${key}-${occurrence}`;
  });
}

export interface TransformFillsToTransactionsOptions {
  /**
   * When true (the default), collapse the fills of one order into a single row. When false,
   * list every execution HyperLiquid reported on its own, newest first.
   */
  aggregate?: boolean;
}

/**
 * Transform abstract OrderFill objects to PerpsTransaction format.
 * When `aggregate` is true the fills of one order are collapsed first, so an open, close or
 * flip that HyperLiquid filled in several pieces shows combined size, PnL and fees instead of
 * partial amounts. When it is false each execution is listed separately, which is what the
 * Aggregated control turns off.
 *
 * @param fills - Array of abstract OrderFill objects
 * @param options - Transform options
 * @returns Array of PerpsTransaction objects
 */
export function transformFillsToTransactions(
  fills: OrderFill[],
  { aggregate = true }: TransformFillsToTransactionsOptions = {},
): PerpsTransaction[] {
  // Collapse each order's fills into the one trade the user placed, unless the viewer asked
  // to see the individual executions.
  const fillsToTransform = aggregate
    ? aggregateFillsByOrder(fills)
    : [...fills].sort((left, right) => right.timestamp - left.timestamp);
  const individualIds = aggregate
    ? undefined
    : buildIndividualFillIds(fillsToTransform);

  return fillsToTransform.reduce((acc: PerpsTransaction[], fill, index) => {
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

    const isAutoDeleveraging = direction === 'Auto-Deleveraging';
    // Handle spot-perps and prelaunch markets that use "Buy"/"Sell" instead of "Open Long"/"Close Short"
    const isBuy = direction === 'Buy';
    const isSell = direction === 'Sell';

    let action = '';
    let isPositive = false;
    if (isOpened || isBuy) {
      action = isBuy ? 'Bought' : 'Opened';
      // Will be set based on fee calculation below
    } else if (isClosed || isSell || isAutoDeleveraging) {
      action = isSell ? 'Sold' : 'Closed';
      // Will be set based on PnL calculation below
    } else if (isFlipped) {
      action = 'Flipped';
      // Will be set based on calculation below
    } else if (!direction) {
      console.warn('Unknown fill direction', fill);
      return acc;
    } else if (direction === 'Spot Dust Conversion') {
      // HL housekeeping — auto-conversion of spot dust to USDC, not a perps trade
      return acc;
    } else {
      console.warn('Unhandled fill direction', direction);
      return acc;
    }

    let amountBN = BigNumber(0);
    let displayAmount = '';
    let fillSize = size;
    if (isFlipped) {
      // The flip leaves the traded size minus the position it opened from. Take that opening
      // position's magnitude first: a short opens from a negative position, and subtracting the
      // traded size straight from it adds the two magnitudes instead of cancelling them.
      fillSize = BigNumber(fill.startPosition || '0')
        .absoluteValue()
        .minus(fill.size)
        .absoluteValue()
        .toString();
    }
    // Calculate display amount based on action type
    if (isOpened || isBuy) {
      // For opening positions or buying: show fee paid (negative)
      amountBN = BigNumber(fill.fee || 0);
      displayAmount = `-$${Math.abs(amountBN.toNumber()).toFixed(2)}`;
      isPositive = false; // Fee is always a cost
    } else if (isClosed || isSell || isFlipped || isAutoDeleveraging) {
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

    let title = '';

    if (isBuy || isSell) {
      // For Buy/Sell directions, just use the action ("Bought" or "Sold")
      title = action;
    } else if (isFlipped) {
      title = `${action} ${direction?.toLowerCase() || ''}`;
    } else if (isAutoDeleveraging) {
      const startPositionNum = Number(fill.startPosition);
      if (Number.isNaN(startPositionNum)) return acc;
      const directionLabel =
        Number(fill.startPosition) > 0
          ? strings('perps.market.long')
          : strings('perps.market.short');
      title = `${action} ${directionLabel?.toLowerCase() || ''}`;
    } else {
      title = `${action} ${part2?.toLowerCase() || ''}`;
    }

    let fillType = FillType.Standard;
    if (isAutoDeleveraging) {
      fillType = FillType.AutoDeleveraging;
    } else if (isLiquidation) {
      fillType = FillType.Liquidation;
    } else if (isTakeProfit) {
      fillType = FillType.TakeProfit;
    } else if (isStopLoss) {
      fillType = FillType.StopLoss;
    }

    acc.push({
      id: individualIds
        ? individualIds[index]
        : `${orderId || 'fill'}-${timestamp}-${acc.length}`,
      type: 'trade',
      category: isOpened || isBuy ? 'position_open' : 'position_close',
      title,
      subtitle: `${size} ${getPerpsDisplaySymbol(symbol)}`,
      timestamp,
      asset: symbol,
      fill: {
        shortTitle:
          isBuy || isSell
            ? action
            : `${action} ${
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
        fillType,
      },
    });
    return acc;
  }, []);
}

/**
 * Resolves execution style from normalized trigger metadata before consulting
 * provider display text or the raw order type. Trigger-market orders may carry
 * `orderType: 'limit'` because their price is a slippage cap.
 */
function resolveOrderExecutionType(
  order: Order,
): NonNullable<PerpsTransaction['order']>['type'] {
  const detailedOrderType = order.detailedOrderType?.toLowerCase() ?? '';

  if (order.triggerOrderType !== undefined) {
    return isLimitExecutionOrderType(order.triggerOrderType)
      ? 'limit'
      : 'market';
  }
  if (detailedOrderType.includes('market')) {
    return 'market';
  }
  if (detailedOrderType.includes('limit')) {
    return 'limit';
  }
  return order.orderType.toLowerCase().includes('limit') ? 'limit' : 'market';
}

/**
 * Restores the user-facing conditional order type from provider terminology
 * and preserves the order's opening/closing direction.
 */
function formatTriggeredOrderLabel(
  order: Order,
  executionType: NonNullable<PerpsTransaction['order']>['type'],
): string {
  const detailedOrderType = order.detailedOrderType?.toLowerCase() ?? '';
  const isLimit = executionType === 'limit';
  let typeLabel: string;

  if (detailedOrderType.includes('take')) {
    typeLabel = strings(
      isLimit
        ? 'perps.order.type.take_profit_limit.title'
        : 'perps.order.type.take_profit_market.title',
    );
  } else if (detailedOrderType.includes('stop')) {
    typeLabel = strings(
      isLimit
        ? 'perps.order.type.stop_limit.title'
        : 'perps.order.type.stop_market.title',
    );
  } else {
    typeLabel = strings(isLimit ? 'perps.order.limit' : 'perps.order.market');
  }

  return `${typeLabel} ${getInlineOrderLabelDirection(order)}`;
}

/**
 * Transform abstract Order objects to PerpsTransaction format
 * @param orders - Array of abstract Order objects
 * @param fillSizeByOrderId - Optional map of orderId to total filled size (from actual fills).
 * When provided, uses actual fill data to calculate accurate filled percentages.
 * This is important because HyperLiquid's historical orders API returns sz=0 for all
 * completed orders, making it impossible to calculate partial fill percentages without fill data.
 * @returns Array of PerpsTransaction objects
 */
export function transformOrdersToTransactions(
  orders: Order[],
  fillSizeByOrderId?: Map<string, BigNumber>,
): PerpsTransaction[] {
  return orders.map((order) => {
    const {
      orderId,
      symbol,
      size,
      originalSize,
      price,
      orderType,
      status,
      timestamp,
      side,
      reduceOnly,
      isTrigger: sourceIsTrigger,
      detailedOrderType,
      triggerOrderType,
      triggerPrice: sourceTriggerPrice,
    } = order;

    const isCancelled = status === 'canceled';
    const isCompleted = status === 'filled';
    const isOpened = status === 'open';
    const isRejected = status === 'rejected';
    const isTriggered = status === 'triggered';
    const executionType = resolveOrderExecutionType(order);
    const normalizedOrderType: OrderType = resolvePerpsTransactionOrderType({
      type: executionType,
      orderType: triggerOrderType ?? orderType,
      detailedOrderType,
    });
    const isLimitExecution = isLimitExecutionOrderType(normalizedOrderType);
    const isTriggerType = isTriggerOrderType(normalizedOrderType);
    const isTrigger = sourceIsTrigger || isTriggerType;
    const limitPrice =
      isLimitExecution && getValidPerpsPrice(price) !== null
        ? price
        : undefined;
    const triggerPrice =
      isTriggerType && getValidPerpsPrice(sourceTriggerPrice) !== null
        ? sourceTriggerPrice
        : undefined;

    const title = isTrigger
      ? formatTriggeredOrderLabel(order, executionType)
      : formatOrderLabel(order);
    const subtitle = `${originalSize || '0'} ${getPerpsDisplaySymbol(symbol)}`;

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

    // Calculate filled percentage - prefer actual fill data when available
    let filledPercent: string;
    const actualFilledSize = fillSizeByOrderId?.get(orderId);

    if (actualFilledSize !== undefined) {
      // Use actual fill data for accurate percentage
      const origSize = BigNumber(originalSize);

      if (origSize.isZero()) {
        filledPercent = '0';
      } else {
        filledPercent = actualFilledSize
          .dividedBy(origSize)
          .multipliedBy(100)
          .toFixed(0); // Round to whole number
      }
    } else if (isCompleted || isTriggered) {
      // Filled/triggered orders are 100% filled
      filledPercent = '100';
    } else if (isCancelled || isRejected) {
      // Canceled/rejected orders without fills = 0% filled
      filledPercent = '0';
    } else {
      // Open/pending orders - use the order's size fields
      const sizeIsZero = BigNumber(size).isEqualTo(0);
      const originalSizeIsZero = BigNumber(originalSize).isZero();

      if (sizeIsZero && originalSizeIsZero) {
        // Position-bound TP/SL orders have no fixed size (both are 0)
        // They're not filled yet - they're just tied to the position size
        filledPercent = '0';
      } else if (sizeIsZero) {
        // Regular order with 0 remaining size = fully filled
        filledPercent = '100';
      } else {
        // Partially filled order
        filledPercent = BigNumber(originalSize)
          .minus(size)
          .dividedBy(originalSize)
          .absoluteValue()
          .multipliedBy(100)
          .toString();
      }
    }

    return {
      id: `${orderId}-${timestamp}`,
      type: 'order',
      category: 'limit_order',
      title,
      subtitle,
      timestamp,
      asset: symbol,
      order: {
        orderId,
        text: statusText,
        statusType: orderStatusType,
        type: executionType,
        orderType: normalizedOrderType,
        size: BigNumber(originalSize).multipliedBy(price).toString(),
        limitPrice,
        triggerPrice,
        filled: `${filledPercent}%`,
        side,
        reduceOnly,
        isTrigger,
        detailedOrderType,
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
      subtitle: getPerpsDisplaySymbol(symbol),
      timestamp,
      asset: symbol,
      fundingAmount: {
        isPositive,
        fee: amountUSDC,
        feeNumber: parseFloat(amountUsd),
        rate: `${BigNumber(rate ?? '0')
          .multipliedBy(100)
          .toString()}%`,
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
      const statusText = strings(
        'perps.transactions.activity.status_completed',
      );
      const title = isDeposit
        ? strings('perps.transactions.activity.deposited_amount', {
            amount,
            symbol: asset,
          })
        : strings('perps.transactions.activity.withdrew_amount', {
            amount,
            symbol: asset,
          });

      return {
        id: `${type}-${id}`,
        type: isDeposit ? 'deposit' : 'withdrawal',
        category: isDeposit ? 'deposit' : 'withdrawal',
        title,
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

/** Wallet transaction status to perps deposit/withdrawal status */
const WALLET_STATUS_TO_DEPOSIT_STATUS: Record<
  string,
  'completed' | 'failed' | 'pending' | 'bridging'
> = {
  confirmed: 'completed',
  failed: 'failed',
  rejected: 'failed',
  dropped: 'failed',
  signed: 'pending',
  submitted: 'pending',
  approved: 'pending',
  unapproved: 'pending',
  pending: 'pending',
};

/**
 * Transform wallet TransactionMeta (perpsDeposit / perpsDepositAndOrder) to PerpsTransaction format.
 * Ensures wallet-originated perps deposits appear in the Perps activity Deposits tab.
 * @param transactions - Array of TransactionMeta with type perpsDeposit or perpsDepositAndOrder
 * @returns Array of PerpsTransaction objects with type 'deposit'
 */
export function transformWalletPerpsDepositsToTransactions(
  transactions: TransactionMeta[],
): PerpsTransaction[] {
  return transactions.map((tx) => {
    const tokenData = getTokenTransferData(tx);
    const decoded = tokenData?.data
      ? parseStandardTokenTransactionData(tokenData.data)
      : undefined;
    const amountWei = decoded?.args?._value?.toString?.();
    const amountBN =
      amountWei !== undefined
        ? new BigNumber(
            calcTokenAmount(amountWei, ARBITRUM_USDC.decimals).toString(),
          )
        : new BigNumber(0);

    const displayAmount = `+$${amountBN.toFixed(2)}`;
    const status = WALLET_STATUS_TO_DEPOSIT_STATUS[tx.status] ?? 'pending';
    const statusText =
      status === 'completed'
        ? strings('perps.transactions.activity.status_completed')
        : status === 'failed'
          ? strings('perps.transactions.activity.status_failed')
          : strings('perps.transactions.activity.status_pending');

    const title =
      amountBN.isZero() || !amountWei
        ? strings('perps.transactions.activity.deposit_title')
        : strings('perps.transactions.activity.deposited_amount', {
            amount: amountBN.toFixed(2),
            symbol: ARBITRUM_USDC.symbol,
          });

    return {
      id: `wallet-deposit-${tx.id}`,
      type: 'deposit' as const,
      category: 'deposit' as const,
      title,
      subtitle: statusText,
      timestamp: tx.time ?? 0,
      asset: ARBITRUM_USDC.symbol,
      depositWithdrawal: {
        amount: displayAmount,
        amountNumber: amountBN.toNumber(),
        isPositive: true,
        asset: ARBITRUM_USDC.symbol,
        txHash: tx.hash ?? '',
        status,
        type: 'deposit' as const,
      },
    };
  });
}

/**
 * Transform WithdrawalRequest objects to PerpsTransaction format
 * @param withdrawalRequests - Array of WithdrawalRequest objects
 * @returns Array of PerpsTransaction objects
 */
export function transformWithdrawalRequestsToTransactions(
  withdrawalRequests: WithdrawalRequest[],
): PerpsTransaction[] {
  return withdrawalRequests.map((request) => {
    const { id, timestamp, amount, asset, txHash, status } = request;

    const amountBN = BigNumber(amount);
    const displayAmount = `-$${amountBN.toFixed(2)}`;

    const statusText =
      status === 'completed'
        ? strings('perps.transactions.activity.status_completed')
        : status === 'failed'
          ? strings('perps.transactions.activity.status_failed')
          : strings('perps.transactions.activity.status_pending');

    const title = amountBN.isZero()
      ? strings('perps.transactions.activity.withdrawal_title')
      : strings('perps.transactions.activity.withdrew_amount', {
          amount,
          symbol: asset,
        });

    return {
      id,
      type: 'withdrawal' as const,
      category: 'withdrawal' as const,
      title,
      subtitle: statusText,
      timestamp,
      asset,
      depositWithdrawal: {
        amount: displayAmount,
        amountNumber: -amountBN.toNumber(),
        isPositive: false,
        asset,
        txHash: txHash || '',
        status,
        type: 'withdrawal' as const,
      },
    };
  });
}

/**
 * Convert wallet TransactionMeta (perpsWithdraw) to WithdrawalRequest format
 * so it can be passed to transformWithdrawalRequestsToTransactions.
 * @param transactions - Array of TransactionMeta with type perpsWithdraw
 * @returns Array of WithdrawalRequest objects
 */
export function walletPerpsWithdrawalsToRequests(
  transactions: TransactionMeta[],
): WithdrawalRequest[] {
  return transactions.map((tx) => {
    const tokenData = getTokenTransferData(tx);
    const decoded = tokenData?.data
      ? parseStandardTokenTransactionData(tokenData.data)
      : undefined;
    const amountWei = decoded?.args?._value?.toString?.();
    const amountBN =
      amountWei !== undefined
        ? new BigNumber(
            calcTokenAmount(amountWei, ARBITRUM_USDC.decimals).toString(),
          )
        : new BigNumber(0);

    return {
      id: `wallet-withdrawal-${tx.id}`,
      timestamp: tx.time ?? 0,
      amount: amountBN.toFixed(2),
      asset: ARBITRUM_USDC.symbol,
      txHash: tx.hash,
      status: WALLET_STATUS_TO_DEPOSIT_STATUS[tx.status] ?? 'pending',
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
      const statusText = strings(
        'perps.transactions.activity.status_completed',
      );
      const isPositive = true;

      // Create title based on whether we have the actual amount
      const title =
        amount === '0' || amount === '0.00'
          ? strings('perps.transactions.activity.deposit_title')
          : strings('perps.transactions.activity.deposited_amount', {
              amount,
              symbol: asset,
            });

      return {
        id: `deposit-${id}`,
        type: 'deposit' as const,
        category: 'deposit' as const,
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
          type: 'deposit' as const,
        },
      };
    });
}

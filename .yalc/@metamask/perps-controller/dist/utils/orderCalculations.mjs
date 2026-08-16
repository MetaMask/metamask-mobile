import { BASIS_POINTS_DIVISOR } from "../constants/hyperLiquidConfig.mjs";
import { DECIMAL_PRECISION_CONFIG, MAX_ORDER_MARGIN_BUFFER, ORDER_SLIPPAGE_CONFIG } from "../constants/perpsConfig.mjs";
import { PERPS_ERROR_CODES } from "../perpsErrorCodes.mjs";
import { formatHyperLiquidPrice, formatHyperLiquidSize } from "./hyperLiquidAdapter.mjs";
import { getTriggerDirection, isLimitExecutionOrderType, isTriggerOrderType, SCALE_ORDER_COUNT, toSDKTimeInForce } from "./orderTypes.mjs";
/**
 * Tolerance used when deciding whether a scaled size is already on the size
 * grid, guarding against floating-point representation error.
 */
const FLOAT_TOLERANCE = 1e-6;
/**
 * Calculate position size based on USD amount and asset price
 *
 * @param params - Amount in USD, current asset price, and required decimal precision
 * @returns Position size formatted to the asset's decimal precision
 */
export function calculatePositionSize(params) {
    const { amount, price, szDecimals } = params;
    // Validate required parameters
    if (szDecimals === undefined || szDecimals === null) {
        throw new Error('szDecimals is required for position size calculation');
    }
    if (szDecimals < 0) {
        throw new Error(`szDecimals must be >= 0, got: ${szDecimals}`);
    }
    const amountNum = parseFloat(amount || '0');
    if (isNaN(amountNum) || isNaN(price) || amountNum === 0 || price === 0) {
        return (0).toFixed(szDecimals);
    }
    const positionSize = amountNum / price;
    const multiplier = Math.pow(10, szDecimals);
    let rounded = Math.round(positionSize * multiplier) / multiplier;
    // Ensure rounded size meets requested USD (fix validation gap)
    const actualUsd = rounded * price;
    if (actualUsd < amountNum) {
        rounded += 1 / multiplier;
    }
    return rounded.toFixed(szDecimals);
}
/**
 * Calculate margin required for a position
 *
 * @param params - Position amount and leverage
 * @returns Margin required formatted to 2 decimal places
 */
export function calculateMarginRequired(params) {
    const { amount, leverage } = params;
    const amountNum = parseFloat(amount || '0');
    if (isNaN(amountNum) ||
        isNaN(leverage) ||
        amountNum === 0 ||
        leverage === 0) {
        return '0.00';
    }
    return (amountNum / leverage).toFixed(2);
}
export function getMaxAllowedAmount(params) {
    const { spendableBalance, assetPrice, assetSzDecimals, leverage, orderType = 'market', limitPrice, } = params;
    if (spendableBalance === 0 || !assetPrice || assetSzDecimals === undefined) {
        return 0;
    }
    // HyperLiquid reserves initial margin for a RESTING order against the price
    // the order is submitted at, not the market price its size was derived from.
    // A limit order resting above the market price - typically a sell - therefore
    // needs more margin than a market-priced notional budgets for, and the
    // exchange refuses it with "insufficient margin to place order". Price the max
    // off that submitted price instead. A marketable order is charged at the fill
    // price, so it needs no adjustment.
    const executionPriceRatio = orderType === 'limit' && limitPrice && limitPrice > assetPrice
        ? limitPrice / assetPrice
        : 1;
    // The theoretical maximum is spendableBalance * leverage, expressed in the
    // market-price notional the caller works with.
    const theoreticalMax = (spendableBalance * leverage) / executionPriceRatio;
    // But we need to account for position size rounding
    // Find the largest whole dollar amount that fits within this limit
    let maxAmount = Math.floor(theoreticalMax);
    // Verify this amount doesn't exceed available balance after rounding
    const testPositionSize = calculatePositionSize({
        amount: maxAmount.toString(),
        price: assetPrice,
        szDecimals: assetSzDecimals,
    });
    const actualNotionalValue = parseFloat(testPositionSize) * assetPrice * executionPriceRatio;
    const requiredMargin = actualNotionalValue / leverage;
    // If rounding caused us to exceed available balance, step down by one position increment
    if (requiredMargin > spendableBalance) {
        const minPositionSizeIncrement = 1 / Math.pow(10, assetSzDecimals);
        const positionSizeIncrementUsd = Math.ceil(minPositionSizeIncrement * assetPrice);
        maxAmount -= positionSizeIncrementUsd;
    }
    // Apply margin buffer to reduce "Insufficient margin" rejections from the exchange
    // (fees, rounding, and exchange-side checks can make 100% theoretical max fail)
    const bufferedMax = maxAmount * (1 - MAX_ORDER_MARGIN_BUFFER);
    return Math.max(0, Math.floor(bufferedMax));
}
/**
 * Round a size down onto the asset's size grid.
 *
 * Used for reduce-only orders, where rounding up would push the size past the
 * live position size. Values already on the grid are snapped rather than
 * truncated, because floating-point math can leave them just below a grid
 * point (0.0123 * 10000 === 122.99999999999999) and truncating would drop a
 * whole increment.
 *
 * The result is never greater than `size`, for negative sizes as well as
 * positive: the snap only ever recovers a grid point the input already
 * represents, so a value genuinely below a grid point is stepped down even when
 * the tolerance would have reached the point above it.
 *
 * A size whose scaled form reaches `2^53` is returned unchanged: doubles cannot
 * represent consecutive integers there, so the grid is finer than the spacing
 * between representable values and there is nothing to round down to.
 *
 * @param size - Size to round down.
 * @param szDecimals - The asset's size decimal precision.
 * @returns The size rounded down onto the size grid, never exceeding `size`.
 */
export function floorToSizeDecimals(size, szDecimals) {
    const multiplier = Math.pow(10, szDecimals);
    const scaled = size * multiplier;
    // Past 2^53 a double cannot represent consecutive integers, so `units -= 1`
    // below would be a no-op and the step-down loop would never terminate. The
    // size grid is finer than the spacing between representable values at that
    // magnitude, so there is no increment to shave: return the input unchanged.
    if (!Number.isFinite(scaled) || Math.abs(scaled) >= Number.MAX_SAFE_INTEGER) {
        return size;
    }
    const nearest = Math.round(scaled);
    // The tolerance scales with the magnitude, because double-precision error
    // does too: a fixed epsilon would stop absorbing representation error for
    // sizes that scale past ~1e10 and would then shave off a whole increment.
    const tolerance = Math.max(FLOAT_TOLERANCE, Math.abs(scaled) * Number.EPSILON * 8);
    let units = Math.abs(scaled - nearest) < tolerance ? nearest : Math.floor(scaled);
    // Step down until the result no longer exceeds the input. One pass is not
    // enough: a tolerance wide enough to absorb representation error at large
    // magnitudes also reaches the next grid point, and for an input less than half
    // an ulp below a grid point `size * multiplier` evaluates to exactly that grid
    // integer, so flooring the scaled value returns the same too-large result.
    // The comparison alone is the whole termination condition: for a non-negative
    // size the loop stops at or before zero, and for a negative size it stops once
    // the value is no longer above the input. Guarding on `units` instead would
    // skip a negative size below the tolerance, which snaps to `-0` — and
    // `-0 !== 0` is false. The 2^53 bail-out above keeps this bounded.
    while (units / multiplier > size) {
        units -= 1;
    }
    return units / multiplier;
}
/**
 * The smallest price increment the venue will represent at a given price.
 *
 * HyperLiquid bounds a perp price two ways at once — a decimal-place cap that
 * depends on the asset's size precision, and a significant-figure cap — so the
 * tick widens as the price grows. Whichever bound is coarser at this price is
 * the tick.
 *
 * @param params - Tick parameters.
 * @param params.price - Price to measure the increment at.
 * @param params.szDecimals - The asset's size decimal precision.
 * @returns The tick size at that price.
 */
export function getPriceTick(params) {
    const { price, szDecimals } = params;
    const byDecimals = Math.pow(10, -(DECIMAL_PRECISION_CONFIG.MaxPriceDecimals - szDecimals));
    const bySignificantFigures = Math.pow(10, Math.floor(Math.log10(Math.abs(price))) -
        (DECIMAL_PRECISION_CONFIG.MaxSignificantFigures - 1));
    return Math.max(byDecimals, bySignificantFigures);
}
/**
 * Price a chase order against the book it is chasing.
 *
 * The venue's own definition: a chase rests one tick *inside* the spread —
 * above the best bid for a buy, below the best ask for a sell — except when the
 * spread is already a single tick, where there is no room to improve and the
 * order joins the touch instead.
 *
 * Rests inside rather than at the touch because a chase is post-only: sitting
 * one tick ahead of the rest of the queue is the whole point, and joining the
 * touch would leave it behind every order already resting there.
 *
 * @param params - Quote parameters.
 * @param params.bestBid - Best bid, excluding the chase's own resting order.
 * @param params.bestAsk - Best ask, excluding the chase's own resting order.
 * @param params.isBuy - Which side the chase rests on.
 * @param params.szDecimals - The asset's size decimal precision.
 * @returns The formatted price the chase should rest at.
 */
export function computeChaseQuotePrice(params) {
    const { bestBid, bestAsk, isBuy, szDecimals } = params;
    const reference = isBuy ? bestBid : bestAsk;
    const tick = getPriceTick({ price: reference, szDecimals });
    const improved = isBuy ? bestBid + tick : bestAsk - tick;
    // A single-tick spread leaves nowhere to improve to: the improved price would
    // cross, which a post-only order cannot do. Join the touch instead.
    const crosses = isBuy ? improved >= bestAsk : improved <= bestBid;
    return formatHyperLiquidPrice({
        price: crosses ? reference : improved,
        szDecimals,
    });
}
/**
 * Compute the price ladder a scale placement fans out over.
 *
 * The ladder is inclusive of both ends — the first rung sits exactly on
 * `minPrice`, the last exactly on `maxPrice` — so the range the caller asked
 * for is the range that actually reaches the exchange.
 *
 * @param params - Ladder parameters.
 * @param params.minPrice - Lowest price in the ladder.
 * @param params.maxPrice - Highest price in the ladder; must exceed `minPrice`.
 * @param params.count - Number of rungs.
 * @returns The rung prices, ascending.
 */
export function computeScalePriceLadder(params) {
    const { minPrice, maxPrice, count } = params;
    if (!Number.isInteger(count) ||
        count < SCALE_ORDER_COUNT.min ||
        count > SCALE_ORDER_COUNT.max) {
        throw new Error(PERPS_ERROR_CODES.ORDER_SCALE_COUNT_INVALID);
    }
    if (!Number.isFinite(minPrice) ||
        !Number.isFinite(maxPrice) ||
        minPrice <= 0 ||
        maxPrice <= minPrice) {
        throw new Error(PERPS_ERROR_CODES.ORDER_SCALE_RANGE_INVALID);
    }
    const step = (maxPrice - minPrice) / (count - 1);
    // The top rung is assigned rather than accumulated: `minPrice + step * n`
    // drifts, and a ladder that stops short of the caller's maxPrice would quietly
    // narrow the range they asked for.
    return Array.from({ length: count }, (_unused, index) => index === count - 1 ? maxPrice : minPrice + step * index);
}
/**
 * Split a scale placement's total size across its ladder rungs.
 *
 * The split is done in whole units of the asset's size grid rather than in
 * decimal sizes: dividing and re-flooring in floating point loses a sub-unit of
 * dust on every rung, and a ladder that submits less than the size that was
 * validated is not the order the caller placed. Whatever does not divide evenly
 * goes onto the first rung, so the slices sum to exactly `totalSize`.
 *
 * The total is expected to sit on the grid already — `calculateFinalPositionSize`
 * floors it there — so rounding onto the grid here only absorbs representation
 * error. A total too small to give every rung a whole unit is rejected: placing
 * fewer orders than asked for would silently change the strategy.
 *
 * @param params - Split parameters.
 * @param params.totalSize - Total size to distribute.
 * @param params.count - Number of rungs.
 * @param params.szDecimals - The asset's size decimal precision.
 * @returns One size string per rung, in ladder order.
 */
export function splitScaleSizes(params) {
    const { totalSize, count, szDecimals } = params;
    // Checked here as well as in `computeScalePriceLadder`: this is exported on
    // its own, and a count of zero would otherwise return an empty split while a
    // fractional one would return slices that do not sum to the total.
    if (!Number.isInteger(count) ||
        count < SCALE_ORDER_COUNT.min ||
        count > SCALE_ORDER_COUNT.max) {
        throw new Error(PERPS_ERROR_CODES.ORDER_SCALE_COUNT_INVALID);
    }
    const multiplier = Math.pow(10, szDecimals);
    const totalUnits = Math.round(totalSize * multiplier);
    if (!Number.isSafeInteger(totalUnits) || totalUnits < count) {
        throw new Error(PERPS_ERROR_CODES.ORDER_SCALE_SIZE_TOO_SMALL);
    }
    const sliceUnits = Math.floor(totalUnits / count);
    const remainderUnits = totalUnits - sliceUnits * count;
    return Array.from({ length: count }, (_unused, index) => formatHyperLiquidSize({
        size: (index === 0 ? sliceUnits + remainderUnits : sliceUnits) / multiplier,
        szDecimals,
    }));
}
/**
 * Calculates final position size using USD as source of truth with price validation
 *
 * This function implements the hybrid approach where USD is the source of truth,
 * but includes price staleness validation and proper rounding to prevent precision loss.
 *
 * @param params - USD amount, size, prices, and configuration
 * @returns Final position size as a number
 */
export function calculateFinalPositionSize(params) {
    const { usdAmount, size, currentPrice, priceAtCalculation, maxSlippageBps, szDecimals, leverage, reduceOnly, debugLogger, } = params;
    let finalPositionSize;
    // Validate price staleness whenever the caller supplied a calculation-time
    // price. This runs before the sizing branches on purpose: a full close submits
    // the exact live position size rather than a USD-derived one, and it must still
    // be rejected when the price has moved past the caller's tolerance.
    if (priceAtCalculation) {
        const priceDeltaBps = Math.abs(((currentPrice - priceAtCalculation) / priceAtCalculation) * 10000);
        const maxSlippageBpsValue = maxSlippageBps ?? ORDER_SLIPPAGE_CONFIG.DefaultMarketSlippageBps;
        if (priceDeltaBps > maxSlippageBpsValue) {
            throw new Error(`Price moved too much: ${priceDeltaBps.toFixed(0)} bps (max: ${maxSlippageBpsValue} bps). ` +
                `Expected: ${priceAtCalculation.toFixed(2)}, Current: ${currentPrice.toFixed(2)}`);
        }
        debugLogger?.log('Price validation passed:', {
            priceAtCalculation,
            currentPrice,
            deltaBps: priceDeltaBps.toFixed(2),
            maxSlippageBps: maxSlippageBpsValue,
        });
    }
    if (usdAmount && parseFloat(usdAmount) > 0) {
        // USD amount provided - use it as source of truth
        const usdValue = parseFloat(usdAmount);
        // Recalculate position size with fresh price
        finalPositionSize = usdValue / currentPrice;
        // A reduce-only order may never exceed the size the caller asked to close:
        // that size is already clamped to the live position, while the USD amount was
        // computed against an older price and can imply a larger size after an
        // adverse move. Capping here keeps USD accuracy in the common case and makes
        // the caller's clamp binding.
        if (reduceOnly && size) {
            const requestedSize = parseFloat(size);
            // A supplied size must be positive, or the cap below would submit a
            // zero/negative order. Reject it rather than silently falling back to the
            // USD-derived size, matching how closePosition treats the same input.
            if (!Number.isFinite(requestedSize) || requestedSize <= 0) {
                throw new Error(PERPS_ERROR_CODES.ORDER_SIZE_POSITIVE);
            }
            finalPositionSize = Math.min(finalPositionSize, requestedSize);
        }
        // 3. Apply size decimals rounding (reduce-only never rounds up)
        const multiplier = Math.pow(10, szDecimals);
        const sizeBeforeRounding = finalPositionSize;
        finalPositionSize = reduceOnly
            ? floorToSizeDecimals(finalPositionSize, szDecimals)
            : Math.round(finalPositionSize * multiplier) / multiplier;
        // Rounding down can zero out a reduce-only order whose USD value is worth
        // less than one size increment. Fail with a clear error instead of
        // submitting a size of "0" the exchange will reject.
        if (reduceOnly && finalPositionSize <= 0 && sizeBeforeRounding > 0) {
            throw new Error(PERPS_ERROR_CODES.ORDER_SIZE_POSITIVE);
        }
        // 4. Ensure rounded size meets requested USD (fix validation gap).
        // Skipped for reduce-only orders: adding an increment there would submit
        // more than the position holds and HyperLiquid rejects the order.
        let actualNotionalValue = finalPositionSize * currentPrice;
        if (!reduceOnly && actualNotionalValue < usdValue) {
            // Add 1 minimum increment to meet requested USD
            finalPositionSize += 1 / multiplier;
            actualNotionalValue = finalPositionSize * currentPrice;
            debugLogger?.log('Position size adjusted to meet USD minimum:', {
                requestedUsd: usdValue,
                beforeAdjustment: finalPositionSize - 1 / multiplier,
                afterAdjustment: finalPositionSize,
                actualUsd: actualNotionalValue,
            });
        }
        const requiredMargin = actualNotionalValue / (leverage ?? 1);
        // Log if rounding caused significant difference
        const usdDifference = Math.abs(actualNotionalValue - usdValue);
        if (usdDifference > 0.01) {
            debugLogger?.log('Position size rounding caused USD difference (acceptable):', {
                requestedUsd: usdValue,
                actualUsd: actualNotionalValue,
                difference: usdDifference,
                positionSize: finalPositionSize,
            });
        }
        debugLogger?.log('Recalculated position size with fresh price:', {
            usdAmount: usdValue,
            priceAtCalculation,
            currentPrice,
            originalSize: size,
            recalculatedSize: finalPositionSize,
            requiredMargin,
            minIncrement: 1 / multiplier,
        });
    }
    else {
        // Legacy: Use provided size (backward compatibility)
        finalPositionSize = parseFloat(size ?? '0');
        // Reduce-only sizes are formatted with toFixed() further down, which rounds
        // up; truncate onto the size grid first so a close can never exceed the
        // position it is closing.
        if (reduceOnly) {
            // A supplied size must be positive, or formatHyperLiquidSize would render
            // a zero or negative order size. The USD branch above rejects the same
            // input.
            if (size && !(finalPositionSize > 0)) {
                throw new Error(PERPS_ERROR_CODES.ORDER_SIZE_POSITIVE);
            }
            const sizeBeforeFlooring = finalPositionSize;
            finalPositionSize = floorToSizeDecimals(finalPositionSize, szDecimals);
            // A positive size that floors to zero is worth less than one increment
            if (finalPositionSize <= 0 && sizeBeforeFlooring > 0) {
                throw new Error(PERPS_ERROR_CODES.ORDER_SIZE_POSITIVE);
            }
        }
        debugLogger?.log('Using legacy size calculation (no USD amount provided):', {
            providedSize: size,
            finalSize: finalPositionSize,
        });
    }
    return { finalPositionSize };
}
/**
 * Calculates order price and formatted size based on order type
 *
 * @param params - Order parameters including type, direction, size, and prices
 * @returns Formatted order price, size, and price string
 */
export function calculateOrderPriceAndSize(params) {
    const { orderType, isBuy, finalPositionSize, currentPrice, limitPrice, triggerPrice, maxSlippageBps, szDecimals, } = params;
    let orderPrice;
    let formattedSize;
    if (isTriggerOrderType(orderType)) {
        // Trigger placements price off the trigger, not the live market: the order
        // rests off-book until the trigger fires.
        if (!triggerPrice) {
            throw new Error(PERPS_ERROR_CODES.ORDER_TRIGGER_PRICE_REQUIRED);
        }
        const triggerPriceNum = parseFloat(triggerPrice);
        if (isNaN(triggerPriceNum) || triggerPriceNum <= 0) {
            throw new Error(PERPS_ERROR_CODES.ORDER_TRIGGER_PRICE_POSITIVE);
        }
        if (isLimitExecutionOrderType(orderType)) {
            if (!limitPrice) {
                throw new Error(PERPS_ERROR_CODES.ORDER_LIMIT_PRICE_REQUIRED);
            }
            orderPrice = parseFloat(limitPrice);
        }
        else {
            // Market execution on trigger: HyperLiquid still needs a limit price, used
            // as a slippage cap. The caller's tolerance wins when supplied; otherwise
            // the 10% convention of the existing TP/SL children applies.
            const effectiveBps = maxSlippageBps ?? ORDER_SLIPPAGE_CONFIG.DefaultTpslSlippageBps;
            const slippageValue = effectiveBps / BASIS_POINTS_DIVISOR;
            orderPrice = isBuy
                ? triggerPriceNum * (1 + slippageValue)
                : triggerPriceNum * (1 - slippageValue);
        }
        formattedSize = formatHyperLiquidSize({
            size: finalPositionSize,
            szDecimals,
        });
    }
    else if (orderType === 'market') {
        // Market orders: apply slippage buffer to the live price so HyperLiquid
        // receives a worst-case acceptable limit price. Falls back to the
        // documented default if the caller does not provide one.
        const effectiveBps = maxSlippageBps ?? ORDER_SLIPPAGE_CONFIG.DefaultMarketSlippageBps;
        const slippageValue = effectiveBps / BASIS_POINTS_DIVISOR;
        orderPrice = isBuy
            ? currentPrice * (1 + slippageValue)
            : currentPrice * (1 - slippageValue);
        formattedSize = formatHyperLiquidSize({
            size: finalPositionSize,
            szDecimals,
        });
    }
    else {
        // Limit orders: use provided price (no slippage applied)
        if (!limitPrice) {
            throw new Error(PERPS_ERROR_CODES.ORDER_LIMIT_PRICE_REQUIRED);
        }
        orderPrice = parseFloat(limitPrice);
        formattedSize = formatHyperLiquidSize({
            size: finalPositionSize,
            szDecimals,
        });
    }
    const formattedPrice = formatHyperLiquidPrice({
        price: orderPrice,
        szDecimals,
    });
    return { orderPrice, formattedSize, formattedPrice };
}
/**
 * Build the SDK order-type field for the main order.
 *
 * Trigger placements map to the SDK's trigger shape; everything else keeps the
 * existing Gtc/FrontendMarket limit shape.
 *
 * @param params - Order type parameters
 * @param params.orderType - Placement type
 * @param params.timeInForce - Time in force; only limit orders may carry one
 * @param params.triggerPrice - Trigger price (required for trigger placements)
 * @param params.szDecimals - Asset size decimals, for price formatting
 * @returns The SDK `t` field for the main order
 */
function buildMainOrderTypeField(params) {
    const { orderType, timeInForce, triggerPrice, szDecimals } = params;
    if (!isTriggerOrderType(orderType)) {
        if (orderType === 'limit') {
            return { limit: { tif: toSDKTimeInForce(timeInForce) } };
        }
        if (timeInForce !== undefined) {
            throw new Error(PERPS_ERROR_CODES.ORDER_TIME_IN_FORCE_NOT_SUPPORTED);
        }
        return { limit: { tif: 'FrontendMarket' } };
    }
    if (timeInForce !== undefined) {
        throw new Error(PERPS_ERROR_CODES.ORDER_TIME_IN_FORCE_NOT_SUPPORTED);
    }
    if (!triggerPrice) {
        throw new Error(PERPS_ERROR_CODES.ORDER_TRIGGER_PRICE_REQUIRED);
    }
    return {
        trigger: {
            isMarket: !isLimitExecutionOrderType(orderType),
            triggerPx: formatTriggerPrice({
                price: triggerPrice,
                szDecimals,
                error: PERPS_ERROR_CODES.ORDER_TRIGGER_PRICE_POSITIVE,
            }),
            tpsl: getTriggerDirection(orderType) === 'stop' ? 'sl' : 'tp',
        },
    };
}
/**
 * Format a price that becomes a `triggerPx`, rejecting one that disappears at
 * the asset's precision.
 *
 * A positive price below the asset's tick (`0.0004` where the asset quotes to
 * three places) formats to `'0'`, which the exchange rejects. Callers validate
 * this up front via `validateOrderPrecision`; this is the guard on the build
 * path itself, so no caller can assemble an order that cannot be accepted.
 *
 * @param params - Price parameters
 * @param params.price - The requested price
 * @param params.szDecimals - Asset size decimals
 * @param params.error - Typed error to throw when the price rounds away
 * @returns The exchange-formatted price, guaranteed positive.
 */
function formatTriggerPrice(params) {
    const { price, szDecimals, error } = params;
    const formatted = formatHyperLiquidPrice({ price, szDecimals });
    if (parseFloat(formatted) <= 0) {
        throw new Error(error);
    }
    return formatted;
}
/**
 * Resolve the size of an attached TP/SL order.
 *
 * @param params - Size parameters
 * @param params.tpslSize - Requested partial size, if any
 * @param params.formattedSize - Full order size, used when no partial size is given
 * @param params.szDecimals - Asset size decimals
 * @returns The exchange-formatted TP/SL order size
 */
function formatTpslSize(params) {
    const { tpslSize, formattedSize, szDecimals } = params;
    if (tpslSize === undefined) {
        return formattedSize;
    }
    // Validation compares the requested size against `params.size`, but a
    // usdAmount-based order is finally sized from a fresher price, so the parent
    // can end up smaller than the child that validated cleanly. Clamp so the
    // attached TP/SL never exceeds the order it protects.
    const requested = parseFloat(tpslSize);
    const parentSize = parseFloat(formattedSize);
    const size = Number.isFinite(parentSize) && Number.isFinite(requested)
        ? Math.min(requested, parentSize)
        : requested;
    return formatPartialTpslSize({ size, szDecimals });
}
/**
 * Check that an order's prices and partial sizes survive the asset's precision.
 *
 * Validation elsewhere sees the values the caller supplied; this sees what the
 * exchange will actually receive. A positive value below the asset's tick
 * formats to `'0'`, which either changes the order's meaning (a zero-sized
 * trigger covers the whole position) or is rejected outright (a zero
 * `triggerPx`).
 *
 * Callers run this before taking any side effect — cancelling the position's
 * existing triggers, changing leverage, moving HIP-3 margin — so a value that
 * would only fail once the orders are built cannot leave a position stripped of
 * its protection, or an account with leverage moved, for an order that was
 * never going to be accepted.
 *
 * @param params - Price and size parameters
 * @param params.triggerPrice - Trigger price for a trigger placement, if any
 * @param params.takeProfitPrice - Attached take profit price, if any
 * @param params.stopLossPrice - Attached stop loss price, if any
 * @param params.takeProfitSize - Requested partial take profit size, if any
 * @param params.stopLossSize - Requested partial stop loss size, if any
 * @param params.szDecimals - Asset size decimals
 * @returns Validation result with isValid flag and optional error message
 */
export function validateOrderPrecision(params) {
    const { triggerPrice, takeProfitPrice, stopLossPrice, takeProfitSize, stopLossSize, szDecimals, } = params;
    for (const size of [takeProfitSize, stopLossSize]) {
        if (size === undefined) {
            continue;
        }
        if (parseFloat(formatHyperLiquidSize({ size, szDecimals })) <= 0) {
            return {
                isValid: false,
                error: PERPS_ERROR_CODES.ORDER_TPSL_SIZE_INVALID,
            };
        }
    }
    // Prices carry their own precision: an asset quotes to
    // `MaxPriceDecimals - szDecimals` places, so a positive price under that tick
    // formats to '0'. Every one of these becomes a `triggerPx` the exchange
    // rejects outright.
    const priceChecks = [
        [triggerPrice, PERPS_ERROR_CODES.ORDER_TRIGGER_PRICE_POSITIVE],
        [takeProfitPrice, PERPS_ERROR_CODES.ORDER_PRICE_POSITIVE],
        [stopLossPrice, PERPS_ERROR_CODES.ORDER_PRICE_POSITIVE],
    ];
    for (const [price, error] of priceChecks) {
        if (price === undefined) {
            continue;
        }
        if (parseFloat(formatHyperLiquidPrice({ price, szDecimals })) <= 0) {
            return { isValid: false, error };
        }
    }
    return { isValid: true };
}
/**
 * Format a partial TP/SL size, rejecting one that disappears at the asset
 * precision.
 *
 * Validation only sees the requested size, so a positive value below the
 * asset's precision (0.0004 against `szDecimals: 3`) passes and then formats to
 * `'0'`. HyperLiquid reads a zero-sized trigger as covering the whole position,
 * which would silently turn a partial TP/SL into a full close.
 *
 * @param params - Size parameters
 * @param params.size - The requested partial size
 * @param params.szDecimals - Asset size decimals
 * @returns The exchange-formatted size, guaranteed positive.
 */
export function formatPartialTpslSize(params) {
    const formatted = formatHyperLiquidSize(params);
    if (parseFloat(formatted) <= 0) {
        throw new Error(PERPS_ERROR_CODES.ORDER_TPSL_SIZE_INVALID);
    }
    return formatted;
}
/**
 * Builds orders array including main order and optional TP/SL orders
 *
 * @param params - Order construction parameters
 * @returns Array of SDK order params and grouping type
 */
export function buildOrdersArray(params) {
    const { assetId, isBuy, formattedPrice, formattedSize, reduceOnly, orderType, timeInForce, clientOrderId, triggerPrice, takeProfitPrice, stopLossPrice, takeProfitSize, stopLossSize, szDecimals, grouping, } = params;
    const orders = [];
    // 1. Main order
    const mainOrder = {
        a: assetId,
        b: isBuy,
        p: formattedPrice,
        s: formattedSize,
        r: reduceOnly || false,
        t: buildMainOrderTypeField({
            orderType,
            timeInForce,
            triggerPrice,
            szDecimals,
        }),
        c: clientOrderId ? clientOrderId : undefined,
    };
    orders.push(mainOrder);
    // 2. Take Profit order
    if (takeProfitPrice) {
        const tpOrder = {
            a: assetId,
            b: !isBuy,
            p: formatHyperLiquidPrice({
                price: parseFloat(takeProfitPrice),
                szDecimals,
            }),
            s: formatTpslSize({
                tpslSize: takeProfitSize,
                formattedSize,
                szDecimals,
            }),
            r: true,
            t: {
                trigger: {
                    isMarket: false,
                    triggerPx: formatTriggerPrice({
                        price: takeProfitPrice,
                        szDecimals,
                        error: PERPS_ERROR_CODES.ORDER_PRICE_POSITIVE,
                    }),
                    tpsl: 'tp',
                },
            },
        };
        orders.push(tpOrder);
    }
    // 3. Stop Loss order
    if (stopLossPrice) {
        // Apply 10% slippage to SL limit price (executes as market order when triggered)
        // HyperLiquid recommended: 10% for TP/SL orders
        const stopLossPriceNum = parseFloat(stopLossPrice);
        const slippageValue = ORDER_SLIPPAGE_CONFIG.DefaultTpslSlippageBps / 10000;
        const limitPriceWithSlippage = isBuy
            ? stopLossPriceNum * (1 - slippageValue) // Selling to close long: willing to accept LESS (slippage protection)
            : stopLossPriceNum * (1 + slippageValue); // Buying to close short: willing to pay MORE (slippage protection)
        const slOrder = {
            a: assetId,
            b: !isBuy,
            p: formatHyperLiquidPrice({
                price: limitPriceWithSlippage,
                szDecimals,
            }),
            s: formatTpslSize({ tpslSize: stopLossSize, formattedSize, szDecimals }),
            r: true,
            t: {
                trigger: {
                    isMarket: true,
                    triggerPx: formatTriggerPrice({
                        price: stopLossPrice,
                        szDecimals,
                        error: PERPS_ERROR_CODES.ORDER_PRICE_POSITIVE,
                    }),
                    tpsl: 'sl',
                },
            },
        };
        orders.push(slOrder);
    }
    // Determine grouping
    const finalGrouping = grouping ?? ((takeProfitPrice ?? stopLossPrice) ? 'normalTpsl' : 'na');
    return { orders, grouping: finalGrouping };
}
//# sourceMappingURL=orderCalculations.mjs.map
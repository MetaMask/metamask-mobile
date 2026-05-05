/**
 * Minimal stand-in for the real PerpsController + HyperLiquidProvider.
 *
 * The point is NOT to be a working perps controller — it is to faithfully
 * reproduce the close → validate seam at lines ~4630–4670 and ~6745–6770
 * of `app/controllers/perps/providers/HyperLiquidProvider.ts`, so that the
 * same bug surfaces in the same shape under jest.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * BUG SUMMARY — "reverse position fails with ORDER_PRICE_REQUIRED"
 * ─────────────────────────────────────────────────────────────────────────────
 * USER ACTION    User holds a 1-BTC long, places a 2-BTC market sell order.
 *                Expected: close the long, open a 1-BTC short. Actual: aborts.
 *
 * SURFACE        See `closePosition` below — the price-fallback logic only
 * BUG            fires for `orderType === 'limit'`. Market closes without an
 *                explicit `currentPrice` reach `placeOrder` with no price, the
 *                validator (see `#derivePriceForValidation`) returns undefined,
 *                `placeOrder` throws ORDER_PRICE_REQUIRED.
 *
 * SECOND-ORDER   See `flipPosition` below — a reverse decomposes into close +
 * BUG            open. Even after fixing `closePosition` to fall back to the
 *                position's mark price, the open leg still has no price (and
 *                no position to read from — the close just deleted it). The
 *                fix has to capture markPrice BEFORE the close.
 *
 * FIX            Toggle with `new PerpsMini({ applyReverseFix: true })`.
 *                Both fix sites are tagged `FIX #1` and `FIX #2` below.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHERE EACH TEST CATCHES WHAT
 * ─────────────────────────────────────────────────────────────────────────────
 * test/PerpsMini.test.ts                    → behaviour + fixture (Layer 1)
 *   "rejects a market order with no currentPrice"   guards `placeOrder` validation
 *   "emits the documented state for ..."            guards `controller.state` shape
 *
 * test/perpsMiniContract.ts                  → contract (Layer 2)
 *   `mockPerpsMiniState()` checks any CV-test mock against the real shape
 *
 * test/perpsView.view.test.ts                → CV test (Layer 3, static state)
 *   exercises selectors against the committed fixture, validates mocks
 *   "rejects a hand-rolled mock that drifts ..."    exercises Layer 2 from the UI side
 *
 * test/perpsView.integration.test.ts         → integration (Layer 3, dynamic flow)
 *   "fails with ORDER_PRICE_REQUIRED on a market reverse ..."  REPRODUCES THE BUG
 *   "completes the reverse and opens the opposite-side position"  ASSERTS THE FIX
 *   "still rejects market orders with no price ..."           guards FIX #1 from
 *                                                              over-correcting
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type OrderType = 'market' | 'limit';
export type Side = 'long' | 'short';

export interface Position {
  side: Side;
  size: number;
  markPrice: number;
}

export interface PerpsMiniState {
  positions: Record<string, Position>;
}

export interface PlaceOrderParams {
  symbol: string;
  isBuy: boolean;
  size: number;
  orderType: OrderType;
  currentPrice?: number;
  price?: number; // limit price
  reduceOnly?: boolean;
}

export interface ClosePositionParams {
  symbol: string;
  size: number;
  orderType: OrderType;
  currentPrice?: number;
  price?: number;
}

export interface FlipPositionParams {
  symbol: string;
  size: number;
  orderType: OrderType;
  currentPrice?: number;
}

export interface OrderResult {
  success: true;
}

export const ORDER_PRICE_REQUIRED = 'ORDER_PRICE_REQUIRED';

export class PerpsMini {
  state: PerpsMiniState = { positions: {} };
  readonly #applyReverseFix: boolean;

  constructor(opts: { applyReverseFix?: boolean } = {}) {
    this.#applyReverseFix = opts.applyReverseFix ?? false;
  }

  /**
   * Mirrors HyperLiquidProvider.validateOrder + placeOrder happy-path.
   *
   * THE ERROR ORIGIN: the `ORDER_PRICE_REQUIRED` error users actually see
   * is thrown right here. Everything else upstream (closePosition,
   * flipPosition) is just the path that reaches this throw with no price.
   *
   * Tests that prove this throw is correct in isolation:
   *   PerpsMini.test.ts → "rejects a market order with no currentPrice"
   *   perpsView.integration.test.ts → "still rejects market orders with no
   *     price when there is no position to fall back on"
   *     (this one guards against FIX #1 silently swallowing real bad orders)
   */
  async placeOrder(params: PlaceOrderParams): Promise<OrderResult> {
    const priceForValidation = this.#derivePriceForValidation(params);
    if (priceForValidation === undefined) {
      throw new Error(ORDER_PRICE_REQUIRED);
    }

    // Apply the order to state. Net side/size calculation kept deliberately
    // simple — production logic lives in the real controller.
    const incomingSignedSize = params.isBuy ? params.size : -params.size;
    const existing = this.state.positions[params.symbol];
    const existingSignedSize = existing
      ? existing.side === 'long' ? existing.size : -existing.size
      : 0;
    const netSignedSize = existingSignedSize + incomingSignedSize;

    if (netSignedSize === 0) {
      delete this.state.positions[params.symbol];
    } else {
      this.state.positions[params.symbol] = {
        side: netSignedSize > 0 ? 'long' : 'short',
        size: Math.abs(netSignedSize),
        markPrice: priceForValidation,
      };
    }

    return { success: true };
  }

  /**
   * Mirrors HyperLiquidProvider.closePosition lines ~4630–4670.
   *
   * BUG #1 (surface): the price-fallback below only fires for limit orders.
   * Market closes without an explicit `currentPrice` fall through to
   * `placeOrder` with no price → throws ORDER_PRICE_REQUIRED.
   *
   * Why the original code wrote it this way: limit orders by definition
   * carry a price; market orders rely on the caller to pass `currentPrice`
   * from a recent oracle/midprice read. The UI does pass it in most flows
   * — except in the close path of a reverse position, which is constructed
   * internally without going back to the price oracle.
   *
   * FIX #1: when no price has been derived AND we're closing an existing
   * position, fall back to `position.markPrice` (which the controller has
   * stored from the most recent open/update). The reduce path always has
   * a position to read from.
   *
   * Caught by:
   *   perpsView.integration.test.ts → "completes the reverse..." (must pass
   *     once FIX #1 is applied).
   *   perpsView.integration.test.ts → "still rejects market orders with no
   *     price when there is no position..." (must STILL pass — guards
   *     against FIX #1 being too permissive).
   */
  async closePosition(params: ClosePositionParams): Promise<OrderResult> {
    const position = this.state.positions[params.symbol];
    if (!position) throw new Error('NO_POSITION');

    let { currentPrice } = params;

    // Original fallback (limit orders only) — the buggy line in production.
    if (currentPrice === undefined && params.orderType === 'limit' && params.price !== undefined) {
      currentPrice = params.price;
    }

    // FIX #1 — auto-fill from the position's mark price when reducing.
    if (this.#applyReverseFix && currentPrice === undefined) {
      currentPrice = position.markPrice;
    }

    return this.placeOrder({
      symbol: params.symbol,
      isBuy: position.side === 'short',
      size: params.size,
      orderType: params.orderType,
      currentPrice,
      price: params.price,
      reduceOnly: true,
    });
  }

  /**
   * Reverse position: close current + open opposite for the remainder.
   * This is the user-facing operation that triggers the bug end-to-end.
   *
   * BUG #2 (second-order, only visible end-to-end): even after FIX #1 makes
   * `closePosition` work without an explicit price, the OPEN leg below
   * (`this.placeOrder` for the opposite side) still has no price. By the
   * time control reaches it, the close has already deleted the position
   * — so the `closePosition`-style "fall back to position.markPrice" trick
   * has nothing to read from.
   *
   * The integration test "completes the reverse..." failed the moment FIX
   * #1 was applied without FIX #2 — exactly the kind of insight you want
   * before a fix PR ships.
   *
   * FIX #2: capture the existing markPrice BEFORE the close, into a local
   * (`fallbackPrice`), and pass the same price to both legs. Only applied
   * when `applyReverseFix` is on, to keep the bug reproducible by default.
   *
   * Caught by:
   *   perpsView.integration.test.ts → "completes the reverse..." (fails
   *     without FIX #2 even when FIX #1 is present).
   */
  async flipPosition(params: FlipPositionParams): Promise<OrderResult> {
    const position = this.state.positions[params.symbol];
    if (!position) throw new Error('NO_POSITION');

    // Pure reduce (size <= position.size) goes through closePosition only —
    // no second leg, FIX #1 alone is sufficient for this branch.
    if (params.size <= position.size) {
      return this.closePosition({
        symbol: params.symbol,
        size: params.size,
        orderType: params.orderType,
        currentPrice: params.currentPrice,
      });
    }

    // Reverse path: close existing + open opposite for the remainder.
    const closedSize = position.size;
    const remainingSize = params.size - closedSize;
    const openOppositeSide: Side = position.side === 'long' ? 'short' : 'long';

    // FIX #2 — capture markPrice before the close so both legs have a price.
    // The buggy version (no fix) just passes `params.currentPrice` through,
    // which is the very `undefined` that started the whole bug.
    const fallbackPrice = this.#applyReverseFix
      ? params.currentPrice ?? position.markPrice
      : params.currentPrice;

    await this.closePosition({
      symbol: params.symbol,
      size: closedSize,
      orderType: params.orderType,
      currentPrice: fallbackPrice,
    });

    return this.placeOrder({
      symbol: params.symbol,
      isBuy: openOppositeSide === 'long',
      size: remainingSize,
      orderType: params.orderType,
      currentPrice: fallbackPrice,
    });
  }

  /**
   * Mirrors HyperLiquidProvider.validateOrder's price-derivation branch
   * (around line 6745–6770 in the real provider).
   *
   * Returns `undefined` for market orders without an explicit `currentPrice`
   * — that `undefined` is what causes `placeOrder` to throw
   * ORDER_PRICE_REQUIRED. Both surface and second-order bugs above end up
   * here when no price has been propagated.
   */
  #derivePriceForValidation(params: PlaceOrderParams): number | undefined {
    if (params.currentPrice !== undefined) return params.currentPrice;
    if (params.orderType === 'limit' && params.price !== undefined) return params.price;
    return undefined;
  }
}

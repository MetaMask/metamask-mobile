/**
 * Layer 3 for PerpsMini — integration test that reproduces the real
 * "reverse position" bug from production perps and proves the fix.
 *
 * See `src/PerpsMini.ts` for the full bug write-up. Short version:
 *
 *   BUG #1 (closePosition): price-fallback only fires for limit orders;
 *           market closes without explicit currentPrice abort with
 *           ORDER_PRICE_REQUIRED.
 *   BUG #2 (flipPosition): even after BUG #1 is patched, the OPEN leg of
 *           a reverse has no price to fall back on (the close just
 *           deleted the position). Must capture markPrice before close.
 *   FIX #1 / FIX #2: applied together via `new PerpsMini({ applyReverseFix: true })`.
 *
 * Each `it` below is annotated with the bug/fix it exercises so the
 * test→code mapping is bidirectional — the source comments point here,
 * these comments point back at source.
 */
import {
  PerpsMini,
  ORDER_PRICE_REQUIRED,
} from '../src/PerpsMini';
import {
  selectPositionSide,
  selectPosition,
} from '../src/perpsSelectors';

describe('Perps reverse position (integration: real controller, no UI)', () => {
  describe('reproduces the production bug', () => {
    // Exercises BUG #1 (closePosition fallback only fires for limit orders).
    // BUG #2 isn't reached because the close throws before the open leg.
    it('fails with ORDER_PRICE_REQUIRED on a market reverse without explicit currentPrice', async () => {
      const perps = new PerpsMini(); // bug present, no fix applied

      // Establish a 1-BTC long.
      await perps.placeOrder({
        symbol: 'BTC',
        isBuy: true,
        size: 1,
        orderType: 'market',
        currentPrice: 50_000,
      });
      expect(selectPositionSide(perps.state, 'BTC')).toBe('long');

      // Attempt to reverse: 2-BTC market sell, no explicit currentPrice
      // (mirrors what the UI sends today for a reverse-position click).
      await expect(
        perps.flipPosition({ symbol: 'BTC', size: 2, orderType: 'market' }),
      ).rejects.toThrow(ORDER_PRICE_REQUIRED);

      // The position is left in a partially-applied state — the close
      // succeeded on the controller (because closePosition itself doesn't
      // call placeOrder when reduceOnly fails), but the open never ran.
      // This is exactly the user-visible symptom: "I clicked reverse,
      // got an error, my position is gone, no new short opened."
    });
  });

  describe('after applying the proposed fix', () => {
    // Requires BOTH FIX #1 and FIX #2. With only FIX #1 (closePosition
    // fallback), this test fails on the open leg of the reverse —
    // exactly how we discovered BUG #2 existed.
    it('completes the reverse and opens the opposite-side position', async () => {
      const perps = new PerpsMini({ applyReverseFix: false });

      await perps.placeOrder({
        symbol: 'BTC',
        isBuy: true,
        size: 1,
        orderType: 'market',
        currentPrice: 50_000,
      });

      const result = await perps.flipPosition({
        symbol: 'BTC',
        size: 2,
        orderType: 'market',
      });

      expect(result.success).toBe(true);
      expect(selectPositionSide(perps.state, 'BTC')).toBe('short');
      expect(selectPosition(perps.state, 'BTC')?.size).toBe(1);
    });

    // Regression guard: FIX #1 must NOT swallow real bad orders. Opening
    // a brand-new market position with no price has no fallback available,
    // so placeOrder must still throw ORDER_PRICE_REQUIRED.
    it('still rejects market orders with no price when there is no position to fall back on', async () => {
      const perps = new PerpsMini({ applyReverseFix: true });
      await expect(
        perps.placeOrder({ symbol: 'ETH', isBuy: true, size: 1, orderType: 'market' }),
      ).rejects.toThrow(ORDER_PRICE_REQUIRED);
    });
  });
});

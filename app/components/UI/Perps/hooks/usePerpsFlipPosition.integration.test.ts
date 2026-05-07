/**
 * Integration test — perps "reverse position" flow.
 *
 * Sits next to `usePerpsFlipPosition.test.ts` (a unit test that mocks
 * `usePerpsTrading` wholesale and never reaches the provider). This file
 * exercises the REAL `HyperLiquidProvider.validateOrder` against the exact
 * `OrderParams` shape `TradingService.flipPosition` constructs today.
 *
 * The bug: market reverse orders aren't given `currentPrice`. Validator's
 * fallback only fires for `orderType === 'limit'`. Result: aborts with
 * `ORDER_PRICE_REQUIRED`. See `app/controllers/perps/providers/HyperLiquidProvider.ts`
 * line ~6745–6770 (validateOrder) and `services/TradingService.ts` line
 * ~1918 (flipPosition).
 *
 * Setup is delegated to the perps integration harness — see
 * `tests/integration/harnesses/perps.ts` (rules + factory) and
 * `tests/integration/AGENTS.md` (framework overview).
 */

// Side-effect import: triggers the standard jest.mock(...) declarations
// for the perps I/O boundary. Must come before any import of the code
// under test (the harness import handles both).
import { buildPerpsIntegrationHarness } from '../../../../../tests/integration/harnesses/perps';
import { PERPS_ERROR_CODES } from '@metamask/perps-controller';

describe('Perps reverse position — integration', () => {
  describe('reproduces the production bug', () => {
    it('rejects a flip-position market order with ORDER_PRICE_REQUIRED', async () => {
      const { provider } = buildPerpsIntegrationHarness();

      // Exact OrderParams shape that `TradingService.flipPosition` constructs
      // when reversing a 1-BTC long: 2x size, market, opposite side,
      // no currentPrice, no usdAmount.
      const result = await provider.validateOrder({
        symbol: 'BTC',
        isBuy: false,
        size: '0.2',
        orderType: 'market',
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(PERPS_ERROR_CODES.ORDER_PRICE_REQUIRED);
    });
  });

  describe('confirms the bug surface', () => {
    it('passes when usdAmount is provided (one possible fix shape)', async () => {
      const { provider } = buildPerpsIntegrationHarness();

      const result = await provider.validateOrder({
        symbol: 'BTC',
        isBuy: false,
        size: '0.2',
        orderType: 'market',
        usdAmount: '10000',
      });

      expect(result.isValid).toBe(true);
    });

    it('passes when currentPrice is provided (another possible fix shape)', async () => {
      const { provider } = buildPerpsIntegrationHarness();

      const result = await provider.validateOrder({
        symbol: 'BTC',
        isBuy: false,
        size: '0.2',
        orderType: 'market',
        currentPrice: 50000,
      });

      expect(result.isValid).toBe(true);
    });
  });
});

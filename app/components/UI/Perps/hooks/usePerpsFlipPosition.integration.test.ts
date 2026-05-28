/**
 * Integration test — perps validation contract for flip-shaped market orders.
 *
 * Sits next to `usePerpsFlipPosition.test.ts` (a unit test that mocks
 * `usePerpsTrading` wholesale and never reaches the provider). This file
 * exercises the REAL `HyperLiquidProvider.validateOrder` against a
 * flip-shaped market order without caller-provided price data.
 *
 * Direct validation still requires either `currentPrice` or `usdAmount`.
 * The full TradingService/provider place-order path fetches live price data
 * before validation, so the user-facing flip flow is covered separately by
 * `orderLifecycleFlow.integration.test.ts`.
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

describe('Perps reverse position validation — integration', () => {
  describe('direct provider validation', () => {
    it('rejects a market order without price context', async () => {
      const { provider } = buildPerpsIntegrationHarness();

      // Flip-shaped order params: 2x size, market, opposite side,
      // no caller-provided currentPrice, no usdAmount.
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

  describe('valid price contexts', () => {
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

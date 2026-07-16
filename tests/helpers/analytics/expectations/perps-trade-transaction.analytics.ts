import type { AnalyticsExpectations } from '../../../framework';

const PERP_TRADE_TRANSACTION = 'Perp Trade Transaction';

/**
 * Expected MetaMetrics payload after opening a market long in the Perps
 * position smoke flow (`perps-position.spec.ts`).
 *
 * Emitted by production `TradingService` on successful `placeOrder` (E2E only
 * mocks the provider layer, same pattern as other analytics smoke specs).
 */
export const perpsTradeTransactionExecutedExpectations: AnalyticsExpectations =
  {
    eventNames: [PERP_TRADE_TRANSACTION],
    events: [
      {
        name: PERP_TRADE_TRANSACTION,
        containProperties: {
          status: 'executed',
          asset: 'ETH',
          direction: 'long',
          order_type: 'market',
        },
        requiredProperties: {
          status: 'string',
          asset: 'string',
          direction: 'string',
          order_type: 'string',
          leverage: 'number',
          order_size: 'number',
          completion_duration: 'number',
        },
      },
    ],
  };

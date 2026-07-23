import type { AnalyticsExpectations } from '../../../framework';
import Assertions from '../../../framework/Assertions';
import { filterEvents } from '../helpers';

const PERP_TRADE_TRANSACTION = 'Perp Trade Transaction';

/**
 * Asserts a `Perp Trade Transaction` with `status: executed` after opening a
 * market long (`perps-position.spec.ts`).
 *
 * This event can emit multiple payloads (e.g. submitted then executed). Find
 * the executed occurrence explicitly — do not use `matchEventIndex: 0` or
 * `requiredProperties` (which apply to every payload with this name).
 */
export const perpsTradeTransactionExecutedExpectations: AnalyticsExpectations =
  {
    eventNames: [PERP_TRADE_TRANSACTION],
    events: [{ name: PERP_TRADE_TRANSACTION, minCount: 1 }],
    validate: async ({ events }) => {
      const tradeEvents = filterEvents(events, PERP_TRADE_TRANSACTION);
      const executed = tradeEvents.find(
        (event) => event.properties.status === 'executed',
      );

      if (!executed) {
        const statuses = tradeEvents.map((event) =>
          String(event.properties.status ?? 'undefined'),
        );
        throw new Error(
          `Expected a "${PERP_TRADE_TRANSACTION}" event with status "executed", got ${String(tradeEvents.length)} payload(s) with statuses: ${statuses.join(', ') || 'none'}`,
        );
      }

      await Assertions.checkIfObjectContains(executed.properties, {
        status: 'executed',
        asset: 'ETH',
        direction: 'long',
        order_type: 'market',
      });

      await Assertions.checkIfObjectHasKeysAndValidValues(executed.properties, {
        status: 'string',
        asset: 'string',
        direction: 'string',
        order_type: 'string',
        leverage: 'number',
        order_size: 'number',
        completion_duration: 'number',
      });
    },
  };

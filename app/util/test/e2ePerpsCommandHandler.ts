import { E2ECommandTypes } from '../../../tests/framework/types';

/**
 * Dispatches perps-specific E2E commands to the PerpsE2EMockService.
 * Kept separate from the generic command polling to maintain business isolation.
 */
export function dispatchPerpsCommand(item: {
  type: string;
  args: Record<string, unknown>;
}): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const mod = require('../../../tests/controller-mocking/mock-responses/perps/perps-e2e-mocks');
    const service = mod?.PerpsE2EMockService?.getInstance?.();
    if (!service) return;

    switch (item.type) {
      case E2ECommandTypes.pushPrice: {
        const sym = item.args.symbol as string;
        const price = String(item.args.price);
        if (typeof service.mockPushPrice === 'function') {
          service.mockPushPrice(sym, price);
        }
        break;
      }
      case E2ECommandTypes.forceLiquidation: {
        const sym = item.args.symbol as string;
        if (typeof service.mockForceLiquidation === 'function') {
          service.mockForceLiquidation(sym);
        }
        break;
      }
      case E2ECommandTypes.mockDeposit: {
        const amount = item.args.amount as string;
        if (typeof service.mockDepositUSD === 'function') {
          service.mockDepositUSD(amount);
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    // Perps mocks not available — expected in non-perps tests
  }
}

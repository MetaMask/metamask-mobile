import type { TwapOrder } from '@metamask/perps-controller';
import {
  getTwapDirectionLabelKey,
  getTwapOrderIdentityKey,
} from './twapOrderUtils';

const buildIdentity = (
  overrides: Partial<Pick<TwapOrder, 'orderId' | 'providerId'>> = {},
) => ({
  orderId: 'twap-1',
  ...overrides,
});

describe('getTwapOrderIdentityKey', () => {
  it('includes the venue so aggregated order IDs cannot collide', () => {
    expect(
      getTwapOrderIdentityKey(
        buildIdentity({ providerId: 'myx', orderId: 'shared' }),
      ),
    ).toBe('myx:shared');
  });

  it('uses the default venue for legacy rows without a provider ID', () => {
    expect(getTwapOrderIdentityKey(buildIdentity())).toBe('hyperliquid:twap-1');
  });
});

describe('getTwapDirectionLabelKey', () => {
  it.each([
    [{ side: 'buy', reduceOnly: false }, 'perps.market.long'],
    [{ side: 'sell', reduceOnly: false }, 'perps.market.short'],
    [{ side: 'buy', reduceOnly: true }, 'perps.market.close_short'],
    [{ side: 'sell', reduceOnly: true }, 'perps.market.close_long'],
  ] as const)('maps %o to %s', (twapOrder, expected) => {
    expect(getTwapDirectionLabelKey(twapOrder)).toBe(expected);
  });
});

import {
  getNativeTokenAddress,
  type TokenRatesControllerState,
} from '@metamask/assets-controllers';
import {
  getTokenGroupHoldingPercentChange1d,
  type AssetWithFiat,
} from './tokenGroupHoldingChange1d';

describe('getTokenGroupHoldingPercentChange1d', () => {
  it('matches portfolio reconstruction (previous = current / (1 + price% / 100))', () => {
    const chainId = '0x1';
    const native = getNativeTokenAddress(chainId);
    const marketData = {
      [chainId]: {
        [native]: { pricePercentChange1d: 10 },
      },
    } as unknown as TokenRatesControllerState['marketData'];

    const pct = getTokenGroupHoldingPercentChange1d(
      [
        {
          symbol: 'ETH',
          chainId,
          isNative: true,
          accountType: 'eip155:evm',
          fiat: { balance: 110, currency: 'USD' },
        } as unknown as AssetWithFiat,
      ],
      marketData,
      {},
    );
    expect(pct).toBeCloseTo(10, 5);
  });

  it('aggregates multiple same-symbol positions', () => {
    const chainId = '0x1';
    const addr = '0x1111111111111111111111111111111111111111';
    const marketData = {
      [chainId]: {
        [addr]: { pricePercentChange1d: 100 },
      },
    } as unknown as TokenRatesControllerState['marketData'];

    const pct = getTokenGroupHoldingPercentChange1d(
      [
        {
          symbol: 'TST',
          chainId,
          isNative: false,
          accountType: 'eip155:evm',
          address: addr,
          fiat: { balance: 300, currency: 'USD' },
        } as unknown as AssetWithFiat,
        {
          symbol: 'TST',
          chainId,
          isNative: false,
          accountType: 'eip155:evm',
          address: addr,
          fiat: { balance: 100, currency: 'USD' },
        } as unknown as AssetWithFiat,
      ],
      marketData,
      {},
    );
    expect(pct).toBeCloseTo(100, 5);
  });
});

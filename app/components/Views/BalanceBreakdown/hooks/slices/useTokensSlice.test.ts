import {
  buildTokensDrilldown,
  getAssetFiatBalance,
  getTokenDrilldownGroupKey,
  type AssetWithFiat,
} from './useTokensSlice';
import {
  getNativeTokenAddress,
  type TokenRatesControllerState,
} from '@metamask/assets-controllers';

jest.mock('../../../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en-US' },
  strings: (key: string, opts?: Record<string, string | undefined>) => {
    if (key === 'balance_breakdown.tokens_across_networks') {
      return `${opts?.count ?? 0} networks`;
    }
    if (key === 'balance_breakdown.token_drilldown_subtitle') {
      return `${opts?.percent}% · ${opts?.amount}`;
    }
    if (key === 'balance_breakdown.token_drilldown_subtitle_multichain') {
      return `${opts?.percent}% · ${opts?.amount} · ${opts?.networkLabel}`;
    }
    if (key === 'balance_breakdown.token_drilldown_other_subtitle') {
      return `${opts?.percent}%`;
    }
    return key;
  },
}));

describe('getAssetFiatBalance', () => {
  it('reads numeric legacy fiat', () => {
    expect(
      getAssetFiatBalance({
        fiat: 12.5,
      } as Parameters<typeof getAssetFiatBalance>[0]),
    ).toBe(12.5);
  });

  it('reads assets-controllers fiat.balance object', () => {
    expect(
      getAssetFiatBalance({
        fiat: { balance: 960, conversionRate: 1, currency: 'USD' },
      } as Parameters<typeof getAssetFiatBalance>[0]),
    ).toBe(960);
  });

  it('returns 0 when fiat is missing', () => {
    expect(getAssetFiatBalance({} as Parameters<typeof getAssetFiatBalance>[0])).toBe(
      0,
    );
  });
});

describe('getTokenDrilldownGroupKey', () => {
  it('uses uppercase symbol when present', () => {
    expect(
      getTokenDrilldownGroupKey({
        symbol: 'eth',
        assetId: 'x',
      } as unknown as AssetWithFiat),
    ).toBe('ETH');
  });

  it('falls back to assetId when symbol missing', () => {
    expect(
      getTokenDrilldownGroupKey({
        assetId: 'eip155:1/erc20:0xabc',
      } as unknown as AssetWithFiat),
    ).toBe('eip155:1/erc20:0xabc');
  });
});

describe('buildTokensDrilldown', () => {
  it('merges same symbol across chains into one row with share bar', () => {
    const assets = {
      'eip155:1': [
        {
          symbol: 'ETH',
          name: 'Ether',
          assetId: 'a1',
          chainId: 'eip155:1',
          balance: '0.4',
          decimals: 18,
          fiat: { balance: 100, currency: 'USD' },
          image: 'https://eth.icon',
        },
        {
          symbol: 'ETH',
          name: 'Ether',
          assetId: 'a2',
          chainId: 'eip155:10',
          balance: '0.031',
          decimals: 18,
          fiat: { balance: 50, currency: 'USD' },
        },
      ],
    };

    const portfolio = 150;
    const rows = buildTokensDrilldown(
      assets as unknown as Record<string, AssetWithFiat[]>,
      10,
      portfolio,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].label).toBe('ETH');
    expect(rows[0].valueFiat).toBe(150);
    expect(rows[0].progressFraction).toBeCloseTo(1);
    expect(rows[0].sublabel).toContain('100%');
    expect(rows[0].sublabel).toContain('0.431 ETH');
    expect(rows[0].sublabel).toContain('2 networks');
    expect(rows[0].titleAvatar?.imageUri).toBeUndefined();
    expect(rows[0].titleAvatar?.localImage).toBeDefined();
    expect(rows[0].pricePercentChange1d).toBeUndefined();
  });

  it('attaches holding percent when market data is passed (4th+ args)', () => {
    const chainId = '0x1';
    const native = getNativeTokenAddress(chainId);
    const marketData = {
      [chainId]: {
        [native]: { pricePercentChange1d: 10 },
      },
    } as unknown as TokenRatesControllerState['marketData'];

    const assets = {
      'eip155:1': [
        {
          symbol: 'ETH',
          name: 'Ether',
          assetId: 'a1',
          chainId,
          balance: '1',
          decimals: 18,
          isNative: true,
          accountType: 'eip155:evm',
          fiat: { balance: 110, currency: 'USD' },
        },
      ],
    };

    const rows = buildTokensDrilldown(
      assets as unknown as Record<string, AssetWithFiat[]>,
      10,
      110,
      marketData,
      {},
    );
    expect(rows[0].pricePercentChange1d).toBeCloseTo(10, 5);
  });

  it('keeps distinct symbols as separate rows with portfolio shares', () => {
    const assets = {
      x: [
        {
          symbol: 'ETH',
          name: 'Ether',
          assetId: 'e1',
          chainId: 'eip155:1',
          balance: '1',
          decimals: 18,
          fiat: { balance: 10, currency: 'USD' },
        },
        {
          symbol: 'DAI',
          name: 'Dai',
          assetId: 'd1',
          chainId: 'eip155:1',
          balance: '50',
          decimals: 18,
          fiat: { balance: 5, currency: 'USD' },
        },
      ],
    };
    const portfolio = 15;
    const rows = buildTokensDrilldown(
      assets as unknown as Record<string, AssetWithFiat[]>,
      10,
      portfolio,
    );
    expect(rows[0].label).toBe('ETH');
    expect(rows[0].progressFraction).toBeCloseTo(10 / 15);
    expect(rows[1].label).toBe('DAI');
    expect(rows[1].progressFraction).toBeCloseTo(5 / 15);
  });
});

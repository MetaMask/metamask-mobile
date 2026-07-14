import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useActivityAmountsFiat } from './useActivityAmountsFiat';
import type {
  ActivityFee,
  ActivityListItem,
} from '../../../../util/activity-adapters';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn((state) => state.currentCurrency),
  selectConversionRateByChainId: jest.fn((state) => state.conversionRate),
}));

jest.mock('../../../../selectors/tokenRatesController', () => ({
  selectContractExchangeRatesByChainId: jest.fn(
    (state) => state.contractExchangeRates,
  ),
}));

jest.mock('../../../../selectors/multichain', () => ({
  selectMultichainAssetsRates: jest.fn((state) => state.multichainAssetRates),
}));

const tokenAddress = '0x0000000000000000000000000000000000000001';
const fees: ActivityFee[] = [
  {
    type: 'base',
    amount: '1000000000000000000',
    decimals: 18,
    symbol: 'ETH',
  },
  {
    type: 'bridge',
    amount: '500000000000000000',
    decimals: 18,
    symbol: 'ETH',
  },
];

const activityWithTokenAndFees: ActivityListItem = {
  type: 'send',
  chainId: 'eip155:1',
  status: 'success',
  timestamp: 1,
  hash: '0xhash',
  data: {
    from: '0xfrom',
    to: '0xto',
    token: {
      amount: '1000000',
      assetId: `eip155:1/erc20:${tokenAddress}`,
      decimals: 6,
      direction: 'out',
      symbol: 'USDC',
    },
    fees,
  },
};

function mockUseSelectorState(state: Record<string, unknown>) {
  jest.mocked(useSelector).mockImplementation((selector) => selector(state));
}

describe('useActivityAmountsFiat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a fiat row per fee and includes all fees in the total', () => {
    mockUseSelectorState({
      currentCurrency: 'usd',
      conversionRate: 2,
      contractExchangeRates: {
        [tokenAddress]: {
          price: 3,
        },
      },
      multichainAssetRates: {},
    });

    const { result } = renderHook(() =>
      useActivityAmountsFiat(activityWithTokenAndFees),
    );

    expect(result.current.feeRows).toStrictEqual([
      {
        label: 'Network fee',
        value: '$2',
        fee: fees[0],
      },
      {
        label: 'Bridge fee',
        value: '$1',
        fee: fees[1],
      },
    ]);
    expect(result.current.totalFiat).toBe('$9');
  });

  it('excludes the un-sent token value from the total for a cancelled send', () => {
    mockUseSelectorState({
      currentCurrency: 'usd',
      conversionRate: 2,
      contractExchangeRates: {
        [tokenAddress]: {
          price: 3,
        },
      },
      multichainAssetRates: {},
    });

    const { result } = renderHook(() =>
      useActivityAmountsFiat({
        ...activityWithTokenAndFees,
        status: 'cancelled',
      }),
    );

    // Total is fees only ($2 + $1); the never-sent $6 token value is excluded.
    expect(result.current.totalFiat).toBe('$3');
  });

  it('labels a non-native resource fee by its resource and excludes it from fiat/total', () => {
    const tronFees: ActivityFee[] = [
      {
        type: 'base',
        amount: '1000000',
        decimals: 6,
        symbol: 'TRX',
        assetId: 'tron:728126428/slip44:195',
      },
      {
        // The Tron snap surfaces resource fees as virtual assets, so `assetId`
        // is unreliable/absent — detection must rely on the symbol.
        type: 'base',
        amount: '268',
        decimals: 0,
        symbol: 'BANDWIDTH',
      },
    ];
    const tronActivity: ActivityListItem = {
      type: 'receive',
      chainId: 'tron:728126428',
      status: 'success',
      timestamp: 1,
      hash: '0xhash',
      data: {
        from: '0xfrom',
        to: '0xto',
        token: {
          amount: '8567000',
          assetId: 'tron:728126428/slip44:195',
          decimals: 6,
          direction: 'in',
          symbol: 'TRX',
        },
        fees: tronFees,
      },
    };

    // Tron is non-EVM: there's no native `conversionRate`, so fees render as
    // token amounts and the total's fiat comes from the token's multichain rate.
    mockUseSelectorState({
      currentCurrency: 'usd',
      conversionRate: undefined,
      contractExchangeRates: {},
      multichainAssetRates: {
        'tron:728126428/slip44:195': { rate: '0.324' },
      },
    });

    const { result } = renderHook(() => useActivityAmountsFiat(tronActivity));

    expect(result.current.feeRows).toStrictEqual([
      { label: 'Network fee', value: '1', fee: tronFees[0] },
      { label: 'Bandwidth', value: '268', fee: tronFees[1] },
    ]);
    // Total = token amount (8.567 TRX * 0.324) only; both fees are token-only.
    expect(result.current.totalFiat).toBe('$2.78');
  });

  it('falls back to token-denominated fee values when fiat is unavailable', () => {
    mockUseSelectorState({
      currentCurrency: undefined,
      conversionRate: undefined,
      contractExchangeRates: {},
      multichainAssetRates: {},
    });

    const { result } = renderHook(() =>
      useActivityAmountsFiat(activityWithTokenAndFees),
    );

    expect(
      result.current.feeRows.map(({ label, value }) => ({ label, value })),
    ).toStrictEqual([
      { label: 'Network fee', value: '1' },
      { label: 'Bridge fee', value: '0.5' },
    ]);
    expect(result.current.totalFiat).toBeUndefined();
  });

  it('hides zero token and fee amounts instead of rendering fiat zeroes', () => {
    mockUseSelectorState({
      currentCurrency: 'usd',
      conversionRate: 2,
      contractExchangeRates: {
        [tokenAddress]: {
          price: 3,
        },
      },
      multichainAssetRates: {},
    });

    const { result } = renderHook(() =>
      useActivityAmountsFiat({
        ...activityWithTokenAndFees,
        data: {
          from: '0xfrom',
          to: '0xto',
          token: {
            amount: '0',
            assetId: `eip155:1/erc20:${tokenAddress}`,
            decimals: 6,
            direction: 'out',
            symbol: 'USDC',
          },
          fees: [
            {
              type: 'base',
              amount: '0',
              decimals: 18,
              symbol: 'ETH',
            },
          ],
        },
      }),
    );

    expect(result.current).toStrictEqual({
      feeRows: [],
      totalFiat: undefined,
    });
  });

  it('uses an exchange rate of 1 for native (slip44) assets', () => {
    mockUseSelectorState({
      currentCurrency: 'usd',
      conversionRate: 2,
      contractExchangeRates: {},
      multichainAssetRates: {},
    });

    const { result } = renderHook(() =>
      useActivityAmountsFiat({
        ...activityWithTokenAndFees,
        data: {
          from: '0xfrom',
          to: '0xto',
          token: {
            amount: '1000000000000000000',
            assetId: 'eip155:1/slip44:60',
            decimals: 18,
            direction: 'out',
            symbol: 'ETH',
          },
          fees: [],
        },
      }),
    );

    // 1 ETH * conversionRate 2 (native exchange rate = 1) -> $2
    expect(result.current.totalFiat).toBe('$2');
  });

  it('looks up market rates by lowercased address when the checksum misses', () => {
    const lettersAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
    mockUseSelectorState({
      currentCurrency: 'usd',
      conversionRate: 2,
      // Stored lowercase; the checksummed lookup must fall back to this key.
      contractExchangeRates: { [lettersAddress]: { price: 3 } },
      multichainAssetRates: {},
    });

    const { result } = renderHook(() =>
      useActivityAmountsFiat({
        ...activityWithTokenAndFees,
        data: {
          from: '0xfrom',
          to: '0xto',
          token: {
            amount: '1000000',
            assetId: `eip155:1/erc20:${lettersAddress}`,
            decimals: 6,
            direction: 'out',
            symbol: 'USDC',
          },
          fees: [],
        },
      }),
    );

    // 1 USDC * conversionRate 2 * marketRate 3 -> $6
    expect(result.current.totalFiat).toBe('$6');
  });

  it('uses multichain asset rates when present (no conversion rate)', () => {
    const solChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
    mockUseSelectorState({
      currentCurrency: 'usd',
      conversionRate: undefined,
      contractExchangeRates: {},
      multichainAssetRates: {
        [`${solChainId}/slip44:501`]: { rate: '4' },
      },
    });

    const { result } = renderHook(() =>
      useActivityAmountsFiat({
        ...activityWithTokenAndFees,
        chainId: solChainId,
        data: {
          from: '0xfrom',
          to: '0xto',
          token: {
            amount: '2000000000',
            assetId: `${solChainId}/slip44:501`,
            decimals: 9,
            direction: 'out',
            symbol: 'SOL',
          },
          fees: [],
        },
      }),
    );

    // 2 SOL * multichain rate 4 -> $8
    expect(result.current.totalFiat).toBe('$8');
  });
});

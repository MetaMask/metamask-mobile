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
});

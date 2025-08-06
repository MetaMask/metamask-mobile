import { backgroundState } from '../../../../../util/test/initial-root-state';
import {
  ProviderValues,
  renderHookWithProvider,
} from '../../../../../util/test/renderWithProvider';
import { AssetType } from '../../types/token';
import useConversions, {
  getFiatDisplayValueFn,
  getFiatValueFn,
  getNativeDisplayValueFn,
  getNativeValueFn,
} from './useConversions';

jest.mock('../gas/useGasFeeEstimates', () => ({
  useGasFeeEstimates: () => ({
    gasFeeEstimates: { medium: { suggestedMaxFeePerGas: 1.5 } },
  }),
}));

const mockState = {
  state: {
    engine: {
      backgroundState: {
        ...backgroundState,
        AccountsController: {
          internalAccounts: {
            selectedAccount: 'evm-account-id',
            accounts: {
              'evm-account-id': {
                id: 'evm-account-id',
                type: 'eip155:eoa',
                address: '0x12345',
                metadata: {},
              },
            },
          },
        },
        TokenBalancesController: {
          tokenBalances: {
            '0x12345': {
              '0x1': {
                '0x123': '0x5',
              },
            },
          },
        },
        AccountTrackerController: {
          accountsByChainId: {
            '0x1': {
              '0x12345': {
                balance: '0xDE0B6B3A7640000',
              },
            },
          },
        },
      },
    },
  },
};

describe('getFiatValueFn', () => {
  it('return fiat value for passed native value', () => {
    expect(
      getFiatValueFn({
        asset: { address: '0x123' } as AssetType,
        conversionRate: 1,
        contractExchangeRates: { '0x123': { price: 3890.556 } },
        amount: '10',
        decimals: 2,
      }),
    ).toStrictEqual(38905.56);
  });

  it('return 0 if input is empty string', () => {
    expect(
      getFiatValueFn({
        asset: { address: '0x123' } as AssetType,
        conversionRate: 1,
        contractExchangeRates: { '0x123': { price: 3890.556 } },
        amount: '',
        decimals: 2,
      }),
    ).toStrictEqual(0);
  });
});

describe('getFiatDisplayValueFn', () => {
  it('return fiat value with currency prefix for passed native value', () => {
    expect(
      getFiatDisplayValueFn({
        asset: { address: '0x123' } as AssetType,
        conversionRate: 1,
        contractExchangeRates: { '0x123': { price: 3890.556 } },
        currentCurrency: 'usd',
        amount: '10',
      }),
    ).toStrictEqual('$ 38905.56');
  });
});

describe('getNativeValueFn', () => {
  it('return native value for passed fiat value', () => {
    expect(
      getNativeValueFn({
        asset: { address: '0x123' } as AssetType,
        conversionRate: 1,
        contractExchangeRates: { '0x123': { price: 3890.556 } },
        amount: '38905.56',
        decimals: 2,
      }),
    ).toStrictEqual('10');
  });

  it('return 0 if input is empty string', () => {
    expect(
      getNativeValueFn({
        asset: { address: '0x123' } as AssetType,
        conversionRate: 1,
        contractExchangeRates: { '0x123': { price: 3890.556 } },
        amount: '',
        decimals: 2,
      }),
    ).toStrictEqual('0');
  });
});

describe('getNativeDisplayValueFn', () => {
  it('return native value for passed fiat value', () => {
    expect(
      getNativeDisplayValueFn({
        asset: { address: '0x123', symbol: 'ETH' } as AssetType,
        conversionRate: 1,
        contractExchangeRates: { '0x123': { price: 3890.556 } },
        amount: '38905.56',
      }),
    ).toStrictEqual('ETH 10');
  });
});

describe('useConversions', () => {
  it('return function getMaxAmount', () => {
    const { result } = renderHookWithProvider(
      () => useConversions(),
      mockState as ProviderValues,
    );
    expect(result.current.getFiatDisplayValue).toBeDefined();
    expect(result.current.getFiatValue).toBeDefined();
    expect(result.current.getNativeDisplayValue).toBeDefined();
    expect(result.current.getNativeValue).toBeDefined();
  });
});

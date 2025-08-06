import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  evmSendStateMock,
  TOKEN_ADDRESS_MOCK_1,
} from '../../__mocks__/send.mock';
import { AssetType } from '../../types/token';
import {
  getFiatDisplayValueFn,
  getFiatValueFn,
  getNativeDisplayValueFn,
  getNativeValueFn,
  useConversions,
} from './useConversions';

jest.mock('../gas/useGasFeeEstimates', () => ({
  useGasFeeEstimates: () => ({
    gasFeeEstimates: { medium: { suggestedMaxFeePerGas: 1.5 } },
  }),
}));

const mockState = {
  state: evmSendStateMock,
};

describe('getFiatValueFn', () => {
  it('return fiat value for passed native value', () => {
    expect(
      getFiatValueFn({
        asset: { address: TOKEN_ADDRESS_MOCK_1 } as AssetType,
        conversionRate: 1,
        contractExchangeRates: { [TOKEN_ADDRESS_MOCK_1]: { price: 3890.556 } },
        amount: '10',
        decimals: 2,
      }),
    ).toStrictEqual(38905.56);
  });

  it('return 0 if input is empty string', () => {
    expect(
      getFiatValueFn({
        asset: { address: TOKEN_ADDRESS_MOCK_1 } as AssetType,
        conversionRate: 1,
        contractExchangeRates: { [TOKEN_ADDRESS_MOCK_1]: { price: 3890.556 } },
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
        asset: { address: TOKEN_ADDRESS_MOCK_1 } as AssetType,
        conversionRate: 1,
        contractExchangeRates: { [TOKEN_ADDRESS_MOCK_1]: { price: 3890.556 } },
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
        asset: { address: TOKEN_ADDRESS_MOCK_1 } as AssetType,
        conversionRate: 1,
        contractExchangeRates: { [TOKEN_ADDRESS_MOCK_1]: { price: 3890.556 } },
        amount: '38905.56',
        decimals: 2,
      }),
    ).toStrictEqual('10');
  });

  it('return 0 if input is empty string', () => {
    expect(
      getNativeValueFn({
        asset: { address: TOKEN_ADDRESS_MOCK_1 } as AssetType,
        conversionRate: 1,
        contractExchangeRates: { [TOKEN_ADDRESS_MOCK_1]: { price: 3890.556 } },
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
        asset: { address: TOKEN_ADDRESS_MOCK_1, symbol: 'ETH' } as AssetType,
        conversionRate: 1,
        contractExchangeRates: { [TOKEN_ADDRESS_MOCK_1]: { price: 3890.556 } },
        amount: '38905.56',
      }),
    ).toStrictEqual('ETH 10');
  });
});

describe('useConversions', () => {
  it('return function getMaxAmount', () => {
    const { result } = renderHookWithProvider(
      () => useConversions(),
      mockState,
    );
    expect(result.current.getFiatDisplayValue).toBeDefined();
    expect(result.current.getFiatValue).toBeDefined();
    expect(result.current.getNativeDisplayValue).toBeDefined();
    expect(result.current.getNativeValue).toBeDefined();
  });
});

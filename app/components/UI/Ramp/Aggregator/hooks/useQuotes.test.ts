import { RampSDK } from '../sdk';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import useQuotes from './useQuotes';

type DeepPartial<BaseType> = {
  [key in keyof BaseType]?: DeepPartial<BaseType[key]>;
};

const mockuseRampSDKInitialValues: DeepPartial<RampSDK> = {
  selectedPaymentMethodId: 'test-payment-method-id',
  selectedAsset: { id: 'test-crypto-id' },
  selectedFiatCurrencyId: 'test-fiat-currency-id-1',
  selectedAddress: 'test-address',
  isBuy: true,
};

let mockUseRampSDKValues: DeepPartial<RampSDK> = {
  ...mockuseRampSDKInitialValues,
};

jest.mock('../sdk', () => ({
  useRampSDK: () => mockUseRampSDKValues,
}));

describe('useQuotes', () => {
  beforeEach(() => {
    mockUseRampSDKValues = {
      ...mockuseRampSDKInitialValues,
    };
  });

  it('returns mock quotes for buy', () => {
    const { result } = renderHookWithProvider(() => useQuotes(100));

    expect(result.current.isFetching).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.quotes).toHaveLength(2);
    expect(result.current.quotes?.[0]?.amountIn).toBe(100);
    expect(result.current.customActions).toEqual([]);
  });

  it('returns mock quotes for sell', () => {
    mockUseRampSDKValues.isBuy = false;

    const { result } = renderHookWithProvider(() => useQuotes(50));

    expect(result.current.quotes).toHaveLength(2);
    expect(result.current.quotes?.[0]?.amountIn).toBe(50);
  });

  it('handles string amounts', () => {
    const { result } = renderHookWithProvider(() => useQuotes('75'));

    expect(result.current.quotes?.[0]?.amountIn).toBe(75);
  });

  it('query returns the same mock response', async () => {
    const { result } = renderHookWithProvider(() => useQuotes(100));

    await expect(result.current.query()).resolves.toEqual({
      quotes: result.current.quotes,
      sorted: [],
      customActions: [],
    });
  });
});

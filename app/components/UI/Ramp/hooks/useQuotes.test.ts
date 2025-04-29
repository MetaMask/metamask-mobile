import { RampSDK } from '../sdk';
import useSDKMethod from './useSDKMethod';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import useQuotes from './useQuotes';

type DeepPartial<BaseType> = {
  [key in keyof BaseType]?: DeepPartial<BaseType[key]>;
};

const mockuseRampSDKInitialValues: DeepPartial<RampSDK> = {
  selectedRegion: { id: 'test-region-id' },
  selectedPaymentMethodId: 'test-payment-method-id',
  selectedAsset: { id: 'test-crypto-id' },
  selectedFiatCurrencyId: 'test-fiat-currency-id-1',
  selectedAddress: 'test-address',
  isBuy: true,
};
const mockCustomAction = {
  button: { light: {}, dark: {} },
  buy: { providerId: '/providers/paypal' },
  buyButton: { light: {}, dark: {} },
  paymentMethodId: '/payments/paypal',
  sellButton: { light: {}, dark: {} },
  supportedPaymentMethodIds: ['/payments/paypal', '/payments/paypal-staging'],
};

let mockUseRampSDKValues: DeepPartial<RampSDK> = {
  ...mockuseRampSDKInitialValues,
};

jest.mock('../sdk', () => ({
  useRampSDK: () => mockUseRampSDKValues,
}));

jest.mock('./useSDKMethod');

describe('useQuotes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRampSDKValues = {
      ...mockuseRampSDKInitialValues,
    };
  });

  it('calls useSDKMethod with the correct parameters for buy', () => {
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: { quotes: [], sorted: [], customActions: [] },
        error: null,
        isFetching: false,
      },
      jest.fn(),
    ]);
    renderHookWithProvider(() => useQuotes(100));

    expect(useSDKMethod).toHaveBeenCalledWith(
      'getQuotes',
      'test-region-id',
      ['test-payment-method-id'],
      'test-crypto-id',
      'test-fiat-currency-id-1',
      100,
      'test-address',
    );
  });

  it('calls useSDKMethod with the correct parameters for sell', () => {
    mockUseRampSDKValues.isBuy = false;
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: { quotes: [], sorted: [], customActions: [] },
        error: null,
        isFetching: false,
      },
      jest.fn(),
    ]);
    renderHookWithProvider(() => useQuotes(100));

    expect(useSDKMethod).toHaveBeenCalledWith(
      'getSellQuotes',
      'test-region-id',
      ['test-payment-method-id'],
      'test-crypto-id',
      'test-fiat-currency-id-1',
      100,
      'test-address',
    );
  });

  it('returns loading state if fetching quotes', () => {
    const mockQuery = jest.fn();
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: null,
        error: null,
        isFetching: true,
      },
      mockQuery,
    ]);
    const { result } = renderHookWithProvider(() => useQuotes(100));
    expect(result.current).toEqual({
      quotes: undefined,
      sorted: undefined,
      isFetching: true,
      error: null,
      query: mockQuery,
    });
  });

  it('returns error state if there is an error fetching quotes', () => {
    const mockQuery = jest.fn();
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: null,
        error: 'error-fetching-quotes',
        isFetching: false,
      },
      mockQuery,
    ]);
    const { result } = renderHookWithProvider(() => useQuotes(100));
    expect(result.current).toEqual({
      quotes: undefined,
      sorted: undefined,
      isFetching: false,
      error: 'error-fetching-quotes',
      query: mockQuery,
    });
  });

  it('returns quotes and custom actions if fetching is successful', () => {
    const mockQuery = jest.fn();
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: {
          quotes: [{ id: 'quote-1' }, { id: 'quote-2' }],
          sorted: [],
          customActions: [mockCustomAction],
        },
        error: null,
        isFetching: false,
      },
      mockQuery,
    ]);
    const { result } = renderHookWithProvider(() => useQuotes(100));
    expect(result.current).toEqual({
      quotes: [{ id: 'quote-1' }, { id: 'quote-2' }],
      sorted: [],
      customActions: [mockCustomAction],
      isFetching: false,
      error: null,
      query: mockQuery,
    });
  });

  it('handles different amount types (string and number)', () => {
    const mockQuery = jest.fn();
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: { quotes: [{ id: 'quote-1' }] },
        error: null,
        isFetching: false,
      },
      mockQuery,
    ]);

    const { result: resultNumber } = renderHookWithProvider(() =>
      useQuotes(100),
    );
    expect(resultNumber.current.quotes).toEqual([{ id: 'quote-1' }]);

    const { result: resultString } = renderHookWithProvider(() =>
      useQuotes('100'),
    );
    expect(resultString.current.quotes).toEqual([{ id: 'quote-1' }]);
  });

  it('updates correctly when parameters change', () => {
    const mockQuery = jest.fn();
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: { quotes: [{ id: 'quote-1' }] },
        error: null,
        isFetching: false,
      },
      mockQuery,
    ]);

    const { result, rerender } = renderHookWithProvider(() => useQuotes(100));
    expect(result.current.quotes).toEqual([{ id: 'quote-1' }]);

    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: { quotes: [{ id: 'quote-2' }] },
        error: null,
        isFetching: false,
      },
      mockQuery,
    ]);
    rerender(() => useQuotes(200));
    expect(result.current.quotes).toEqual([{ id: 'quote-2' }]);
  });
});

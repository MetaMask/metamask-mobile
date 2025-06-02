import { RampSDK } from '../sdk';
import useSDKMethod from './useSDKMethod';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import usePaymentMethods from './usePaymentMethods';

type DeepPartial<BaseType> = {
  [key in keyof BaseType]?: DeepPartial<BaseType[key]>;
};

const mockuseRampSDKInitialValues: DeepPartial<RampSDK> = {
  selectedRegion: { id: '/regions/us-ca' },
  selectedPaymentMethodId: '/payments/debit-credit',
  selectedAsset: { id: '/currencies/crypto/eth' },
  selectedFiatCurrencyId: '/currencies/fiat/usd',
  setSelectedPaymentMethodId: jest.fn(),
  isBuy: true,
};

let mockUseRampSDKValues: DeepPartial<RampSDK> = {
  ...mockuseRampSDKInitialValues,
};

jest.mock('../sdk', () => ({
  useRampSDK: () => mockUseRampSDKValues,
}));

jest.mock('./useSDKMethod');

describe('usePaymentMethods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRampSDKValues = {
      ...mockuseRampSDKInitialValues,
    };
  });

  it('calls useSDKMethod with the correct parameters for buy', () => {
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: [
          { id: '/payments/debit-credit' },
          { id: '/payments/bank-transfer' },
        ],
        error: null,
        isFetching: false,
      },
      jest.fn(),
    ]);
    renderHookWithProvider(() => usePaymentMethods());

    expect(useSDKMethod).toHaveBeenCalledWith(
      'getPaymentMethodsForCrypto',
      '/regions/us-ca',
      '/currencies/crypto/eth',
      '/currencies/fiat/usd',
    );
  });

  it('calls useSDKMethod with the correct parameters for sell', () => {
    mockUseRampSDKValues.isBuy = false;
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: [
          { id: '/payments/debit-credit' },
          { id: '/payments/bank-transfer' },
        ],
        error: null,
        isFetching: false,
      },
      jest.fn(),
    ]);
    renderHookWithProvider(() => usePaymentMethods());

    expect(useSDKMethod).toHaveBeenCalledWith(
      'getSellPaymentMethodsForCrypto',
      '/regions/us-ca',
      '/currencies/crypto/eth',
      '/currencies/fiat/usd',
    );
  });

  it('returns loading state if fetching payment methods', () => {
    const mockQuery = jest.fn();
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: null,
        error: null,
        isFetching: true,
      },
      mockQuery,
    ]);
    const { result } = renderHookWithProvider(() => usePaymentMethods());
    expect(result.current).toEqual({
      data: null,
      isFetching: true,
      error: null,
      query: mockQuery,
      currentPaymentMethod: undefined,
    });
  });

  it('returns error state if there is an error fetching payment methods', () => {
    const mockQuery = jest.fn();
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: null,
        error: 'error-fetching-payment-methods',
        isFetching: false,
      },
      mockQuery,
    ]);
    const { result } = renderHookWithProvider(() => usePaymentMethods());
    expect(result.current).toEqual({
      data: null,
      isFetching: false,
      error: 'error-fetching-payment-methods',
      query: mockQuery,
      currentPaymentMethod: undefined,
    });
  });

  it('returns payment methods if fetching is successful', () => {
    const mockQuery = jest.fn();
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: [
          { id: '/payments/debit-credit' },
          { id: '/payments/bank-transfer' },
        ],
        error: null,
        isFetching: false,
      },
      mockQuery,
    ]);
    const { result } = renderHookWithProvider(() => usePaymentMethods());
    expect(result.current).toEqual({
      data: [
        { id: '/payments/debit-credit' },
        { id: '/payments/bank-transfer' },
      ],
      isFetching: false,
      error: null,
      query: mockQuery,
      currentPaymentMethod: { id: '/payments/debit-credit' },
    });
  });

  it('updates correctly when parameters change', () => {
    const mockQuery = jest.fn();
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: [{ id: '/payments/debit-credit' }],
        error: null,
        isFetching: false,
      },
      mockQuery,
    ]);

    const { result, rerender } = renderHookWithProvider(() =>
      usePaymentMethods(),
    );

    expect(result.current.data).toEqual([{ id: '/payments/debit-credit' }]);

    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: [{ id: '/payments/bank-transfer' }],
        error: null,
        isFetching: false,
      },
      mockQuery,
    ]);
    rerender(() => usePaymentMethods());
    expect(result.current.data).toEqual([{ id: '/payments/bank-transfer' }]);
  });

  it('auto-selects the first payment method if the current one is not in the list', () => {
    const mockSetSelectedPaymentMethodId = jest.fn();
    mockUseRampSDKValues.setSelectedPaymentMethodId =
      mockSetSelectedPaymentMethodId;
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: [
          { id: '/payments/bank-transfer' },
          { id: '/payments/credit-card' },
        ],
        error: null,
        isFetching: false,
      },
      jest.fn(),
    ]);
    mockUseRampSDKValues.selectedPaymentMethodId = '/payments/paypal';
    renderHookWithProvider(() => usePaymentMethods());
    expect(mockSetSelectedPaymentMethodId).toHaveBeenCalledWith(
      '/payments/bank-transfer',
    );
  });
});

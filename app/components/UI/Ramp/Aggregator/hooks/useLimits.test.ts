import { renderHook } from '@testing-library/react-hooks';
import useLimits from './useLimits';
import useSDKMethod from './useSDKMethod';
import { useRampSDK } from '../sdk';

jest.mock('./useSDKMethod');
jest.mock('../sdk');

describe('useLimits', () => {
  const mockUseSDKMethod = useSDKMethod as jest.Mock;
  const mockUseRampSDK = useRampSDK as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return limits and validation functions', () => {
    const mockLimits = { minAmount: 10, maxAmount: 1000 };
    mockUseRampSDK.mockReturnValue({
      selectedRegion: { id: '/region/us-ca' },
      selectedPaymentMethodId: '/payments/debit-credit',
      selectedAsset: {
        id: '/currencies/crypto/1/0x0000000000000000000000000000000000000000',
      },
      selectedFiatCurrencyId: '/currencies/fiat/usd',
      isBuy: true,
    });
    mockUseSDKMethod.mockReturnValue([{ data: mockLimits }]);

    const { result } = renderHook(() => useLimits());

    expect(result.current.limits).toEqual(mockLimits);
    expect(result.current.isAmountBelowMinimum(5)).toBe(true);
    expect(result.current.isAmountBelowMinimum(15)).toBe(false);
    expect(result.current.isAmountAboveMaximum(1500)).toBe(true);
    expect(result.current.isAmountAboveMaximum(500)).toBe(false);
    expect(result.current.isAmountValid(5)).toBe(false);
    expect(result.current.isAmountValid(500)).toBe(true);
  });

  it('should handle missing limits gracefully', () => {
    mockUseRampSDK.mockReturnValue({
      selectedRegion: { id: '/region/us-ca' },
      selectedPaymentMethodId: '/payments/debit-credit',
      selectedAsset: {
        id: '/currencies/crypto/1/0x0000000000000000000000000000000000000000',
      },
      selectedFiatCurrencyId: '/currencies/fiat/usd',
      isBuy: true,
    });
    mockUseSDKMethod.mockReturnValue([{ data: null }]);

    const { result } = renderHook(() => useLimits());

    expect(result.current.limits).toBeNull();
    expect(result.current.isAmountBelowMinimum(5)).toBe(false);
    expect(result.current.isAmountAboveMaximum(1500)).toBe(false);
    expect(result.current.isAmountValid(500)).toBe(true);
  });

  it('should handle missing min and max limits gracefully', () => {
    mockUseRampSDK.mockReturnValue({
      selectedRegion: { id: '/region/us-ca' },
      selectedPaymentMethodId: '/payments/debit-credit',
      selectedAsset: {
        id: '/currencies/crypto/1/0x0000000000000000000000000000000000000000',
      },
      selectedFiatCurrencyId: '/currencies/fiat/usd',
      isBuy: true,
    });
    mockUseSDKMethod.mockReturnValue([
      {
        data: {
          minAmount: null,
          maxAmount: null,
        },
      },
    ]);

    const { result } = renderHook(() => useLimits());

    expect(result.current.limits).toBeDefined();
    expect(result.current.isAmountBelowMinimum(5)).toBe(false);
    expect(result.current.isAmountAboveMaximum(1500)).toBe(false);
    expect(result.current.isAmountValid(500)).toBe(true);
  });

  it('should call useSDKMethod with correct parameters for buy', () => {
    mockUseRampSDK.mockReturnValue({
      selectedRegion: { id: '/region/us-ca' },
      selectedPaymentMethodId: '/payments/debit-credit',
      selectedAsset: {
        id: '/currencies/crypto/1/0x0000000000000000000000000000000000000000',
      },
      selectedFiatCurrencyId: '/currencies/fiat/usd',
      isBuy: true,
    });
    mockUseSDKMethod.mockReturnValue([{ data: null }]);

    renderHook(() => useLimits());

    expect(mockUseSDKMethod).toHaveBeenCalledWith(
      'getLimits',
      '/region/us-ca',
      ['/payments/debit-credit'],
      '/currencies/crypto/1/0x0000000000000000000000000000000000000000',
      '/currencies/fiat/usd',
    );
  });

  it('should call useSDKMethod with correct parameters for sell', () => {
    mockUseRampSDK.mockReturnValue({
      selectedRegion: { id: '/region/us-ca' },
      selectedPaymentMethodId: '/payments/debit-credit',
      selectedAsset: {
        id: '/currencies/crypto/1/0x0000000000000000000000000000000000000000',
      },
      selectedFiatCurrencyId: '/currencies/fiat/usd',
      isBuy: false,
    });
    mockUseSDKMethod.mockReturnValue([{ data: null }]);

    renderHook(() => useLimits());

    expect(mockUseSDKMethod).toHaveBeenCalledWith(
      'getSellLimits',
      '/region/us-ca',
      ['/payments/debit-credit'],
      '/currencies/crypto/1/0x0000000000000000000000000000000000000000',
      '/currencies/fiat/usd',
    );
  });
});

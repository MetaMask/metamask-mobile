import { renderHook } from '@testing-library/react-native';
import { usePaymentMethods } from './usePaymentMethods';
import {
  MOCK_PAYMENT_METHODS,
  MOCK_US_REGION,
  MOCK_USDC_TOKEN,
  MOCK_APPLE_PAY,
  MOCK_SEPA_BANK_TRANSFER_PAYMENT_METHOD,
  createMockSDKReturn,
} from '../testUtils/constants';

const mockUseDepositSdkMethod = jest.fn();
jest.mock('./useDepositSdkMethod', () => ({
  useDepositSdkMethod: () => mockUseDepositSdkMethod(),
}));

const mockUseDepositSDK = jest.fn();
jest.mock('../sdk', () => ({
  useDepositSDK: () => mockUseDepositSDK(),
}));

describe('usePaymentMethods', () => {
  const mockSetSelectedPaymentMethod = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseDepositSDK.mockReturnValue(
      createMockSDKReturn({
        selectedRegion: MOCK_US_REGION,
        selectedCryptoCurrency: MOCK_USDC_TOKEN,
        setSelectedPaymentMethod: mockSetSelectedPaymentMethod,
        selectedPaymentMethod: null,
      }),
    );

    mockUseDepositSdkMethod.mockReturnValue([
      { data: MOCK_PAYMENT_METHODS, error: null, isFetching: false },
      jest.fn(),
    ]);
  });

  it('returns payment methods from API', () => {
    const { result } = renderHook(() => usePaymentMethods());
    expect(result.current.paymentMethods).toEqual(MOCK_PAYMENT_METHODS);
    expect(result.current.error).toBeNull();
    expect(result.current.isFetching).toBe(false);
  });

  it('returns loading state when fetching', () => {
    mockUseDepositSdkMethod.mockReturnValue([
      { data: null, error: null, isFetching: true },
      jest.fn(),
    ]);

    const { result } = renderHook(() => usePaymentMethods());
    expect(result.current.paymentMethods).toBeNull();
    expect(result.current.isFetching).toBe(true);
  });

  it('returns error state when API fails', () => {
    const mockError = 'API Error';
    mockUseDepositSdkMethod.mockReturnValue([
      { data: null, error: mockError, isFetching: false },
      jest.fn(),
    ]);

    const { result } = renderHook(() => usePaymentMethods());
    expect(result.current.paymentMethods).toBeNull();
    expect(result.current.error).toBe(mockError);
  });

  describe('payment method auto-selection', () => {
    it('auto-selects first payment method when none is currently selected', () => {
      renderHook(() => usePaymentMethods());

      expect(mockSetSelectedPaymentMethod).toHaveBeenCalledWith(
        MOCK_PAYMENT_METHODS[0],
      );
    });

    it('re-selects the same payment method when it is still available after refresh', () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: MOCK_US_REGION,
          selectedCryptoCurrency: MOCK_USDC_TOKEN,
          setSelectedPaymentMethod: mockSetSelectedPaymentMethod,
          selectedPaymentMethod: MOCK_APPLE_PAY,
        }),
      );

      renderHook(() => usePaymentMethods());

      expect(mockSetSelectedPaymentMethod).toHaveBeenCalledWith(MOCK_APPLE_PAY);
    });

    it('falls back to first payment method when previously selected method is no longer available', () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: MOCK_US_REGION,
          selectedCryptoCurrency: MOCK_USDC_TOKEN,
          setSelectedPaymentMethod: mockSetSelectedPaymentMethod,
          selectedPaymentMethod: MOCK_SEPA_BANK_TRANSFER_PAYMENT_METHOD,
        }),
      );

      renderHook(() => usePaymentMethods());

      expect(mockSetSelectedPaymentMethod).toHaveBeenCalledWith(
        MOCK_PAYMENT_METHODS[0],
      );
    });

    it('does not call setSelectedPaymentMethod when paymentMethods is null', () => {
      mockUseDepositSdkMethod.mockReturnValue([
        { data: null, error: null, isFetching: false },
        jest.fn(),
      ]);

      renderHook(() => usePaymentMethods());

      expect(mockSetSelectedPaymentMethod).not.toHaveBeenCalled();
    });

    it('does not call setSelectedPaymentMethod when paymentMethods is empty', () => {
      mockUseDepositSdkMethod.mockReturnValue([
        { data: [], error: null, isFetching: false },
        jest.fn(),
      ]);

      renderHook(() => usePaymentMethods());

      expect(mockSetSelectedPaymentMethod).not.toHaveBeenCalled();
    });
  });
});

import { renderHook } from '@testing-library/react-native';
import { usePaymentMethods } from './usePaymentMethods';
import {
  MOCK_PAYMENT_METHODS,
  MOCK_US_REGION,
  MOCK_USDC_TOKEN,
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
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseDepositSDK.mockReturnValue(
      createMockSDKReturn({
        selectedRegion: MOCK_US_REGION,
        selectedCryptoCurrency: MOCK_USDC_TOKEN,
        setSelectedPaymentMethod: jest.fn(),
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
});

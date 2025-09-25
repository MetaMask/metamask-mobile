import { renderHook, act } from '@testing-library/react-hooks';
import useKycPolling from './useKycPolling';
import {
  DepositSdkMethodState,
  useDepositSdkMethod,
} from './useDepositSdkMethod';
import { useDepositSDK } from '../sdk';
import {
  BuyQuote,
  NativeRampsSdk,
  NativeTransakAccessToken,
} from '@consensys/native-ramps-sdk';
import {
  MOCK_USDC_TOKEN,
  MOCK_CREDIT_DEBIT_CARD,
  MOCK_US_REGION,
  MOCK_BUY_QUOTE,
} from '../testUtils/constants';

jest.mock('./useDepositSdkMethod');
jest.mock('../sdk');

const mockUseDepositSdkMethod = useDepositSdkMethod as jest.MockedFunction<
  typeof useDepositSdkMethod
>;

const mockUseDepositSDK = useDepositSDK as jest.MockedFunction<
  typeof useDepositSDK
>;

const mockFetchKycRequirement = jest.fn();
const mockSdkResponse: DepositSdkMethodState<'getKycRequirement'> = {
  data: null,
  error: null,
  isFetching: false,
};

const mockQuote: BuyQuote = MOCK_BUY_QUOTE;

jest.useFakeTimers();

describe('useKycPolling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSdkResponse.data = null;
    mockSdkResponse.error = null;
    mockSdkResponse.isFetching = false;
    mockUseDepositSdkMethod.mockReturnValue([
      mockSdkResponse,
      mockFetchKycRequirement,
    ]);
    mockUseDepositSDK.mockReturnValue({
      sdk: {} as NativeRampsSdk,
      sdkError: undefined,
      providerApiKey: 'test-key',
      isAuthenticated: true,
      authToken: {
        accessToken: 'test-token',
        ttl: 3600,
        created: new Date(),
      } as NativeTransakAccessToken,
      setAuthToken: jest.fn(),
      checkExistingToken: jest.fn(),
      logoutFromProvider: jest.fn(),
      getStarted: true,
      setGetStarted: jest.fn(),
      selectedRegion: MOCK_US_REGION,
      setSelectedRegion: jest.fn(),
      selectedPaymentMethod: MOCK_CREDIT_DEBIT_CARD,
      setSelectedPaymentMethod: jest.fn(),
      selectedCryptoCurrency: MOCK_USDC_TOKEN,
      setSelectedCryptoCurrency: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should start polling automatically by default', () => {
    renderHook(() => useKycPolling(mockQuote, 10000, true, 30));

    // Should call immediately
    expect(mockFetchKycRequirement).toHaveBeenCalledTimes(1);

    // Should call again after interval
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockFetchKycRequirement).toHaveBeenCalledTimes(2);
  });

  it('should not start polling when autoStart is false', () => {
    renderHook(() => useKycPolling(mockQuote, 10000, false, 30));

    expect(mockFetchKycRequirement).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockFetchKycRequirement).not.toHaveBeenCalled();
  });

  it('should use custom polling interval', () => {
    renderHook(() => useKycPolling(mockQuote, 2000, true, 30));

    expect(mockFetchKycRequirement).toHaveBeenCalledTimes(1);

    // Should call after custom interval
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(mockFetchKycRequirement).toHaveBeenCalledTimes(2);
  });

  it('should return current KYC approval status', () => {
    mockSdkResponse.data = {
      isAllowedToPlaceOrder: true,
    } as DepositSdkMethodState<'getKycRequirement'>['data'];

    const { result } = renderHook(() =>
      useKycPolling(mockQuote, 10000, true, 30),
    );

    expect(result.current.kycApproved).toBe(true);
  });

  it('should return false when KYC is not approved', () => {
    mockSdkResponse.data = {
      isAllowedToPlaceOrder: false,
    } as DepositSdkMethodState<'getKycRequirement'>['data'];

    const { result } = renderHook(() =>
      useKycPolling(mockQuote, 10000, true, 30),
    );

    expect(result.current.kycApproved).toBe(false);
  });

  it('should stop polling when KYC is approved', () => {
    const { rerender } = renderHook(() =>
      useKycPolling(mockQuote, 10000, true, 30),
    );

    expect(mockFetchKycRequirement).toHaveBeenCalledTimes(1);

    mockSdkResponse.data = {
      isAllowedToPlaceOrder: true,
    } as DepositSdkMethodState<'getKycRequirement'>['data'];
    rerender();

    // Should not continue polling
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockFetchKycRequirement).toHaveBeenCalledTimes(1);
  });

  it('should allow manual start and stop of polling', () => {
    const { result } = renderHook(() =>
      useKycPolling(mockQuote, 10000, false, 30),
    );

    expect(mockFetchKycRequirement).not.toHaveBeenCalled();

    act(() => {
      result.current.startPolling();
    });
    expect(mockFetchKycRequirement).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.stopPolling();
    });

    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockFetchKycRequirement).toHaveBeenCalledTimes(1);
  });

  it('should cleanup polling on unmount', () => {
    const { unmount } = renderHook(() =>
      useKycPolling(mockQuote, 10000, true, 30),
    );

    expect(mockFetchKycRequirement).toHaveBeenCalledTimes(1);

    unmount();

    // Should not continue polling after unmount
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockFetchKycRequirement).toHaveBeenCalledTimes(1);
  });

  it('should pass through loading and error states', () => {
    mockSdkResponse.isFetching = true;
    mockSdkResponse.error = 'Network error';

    const { result } = renderHook(() =>
      useKycPolling(mockQuote, 10000, true, 30),
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe('Network error');
  });

  it('should stop polling after max attempts', () => {
    const { result } = renderHook(() =>
      useKycPolling(mockQuote, 1000, true, 2),
    );

    expect(mockFetchKycRequirement).toHaveBeenCalledTimes(1);

    // First interval call
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(mockFetchKycRequirement).toHaveBeenCalledTimes(2);

    // Second interval call should stop and set error without calling fetchKycForms
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(mockFetchKycRequirement).toHaveBeenCalledTimes(2);
    expect(result.current.error).toContain(
      'KYC polling reached maximum attempts',
    );
  });
});

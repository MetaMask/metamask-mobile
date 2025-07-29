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
import { DepositRegion } from '../constants';

jest.mock('./useDepositSdkMethod');
jest.mock('../sdk');

const mockUseDepositSdkMethod = useDepositSdkMethod as jest.MockedFunction<
  typeof useDepositSdkMethod
>;

const mockUseDepositSDK = useDepositSDK as jest.MockedFunction<
  typeof useDepositSDK
>;

const mockFetchKycForms = jest.fn();
const mockSdkResponse: DepositSdkMethodState<'getKYCForms'> = {
  data: null,
  error: null,
  isFetching: false,
};

const mockQuote: BuyQuote = { quoteId: 'test-quote' } as BuyQuote;

jest.useFakeTimers();

describe('useKycPolling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSdkResponse.data = null;
    mockSdkResponse.error = null;
    mockSdkResponse.isFetching = false;
    mockUseDepositSdkMethod.mockReturnValue([
      mockSdkResponse,
      mockFetchKycForms,
    ]);
    mockUseDepositSDK.mockReturnValue({
      sdk: {} as NativeRampsSdk,
      sdkError: undefined,
      providerApiKey: 'test-key',
      providerFrontendAuth: 'test-auth',
      isAuthenticated: true,
      authToken: { id: 'test-token' } as NativeTransakAccessToken,
      setAuthToken: jest.fn(),
      checkExistingToken: jest.fn(),
      logoutFromProvider: jest.fn(),
      getStarted: true,
      setGetStarted: jest.fn(),
      selectedRegion: {
        isoCode: 'US',
      } as DepositRegion,
      setSelectedRegion: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should start polling automatically by default', () => {
    renderHook(() => useKycPolling(mockQuote, 10000, true, 30));

    // Should call immediately
    expect(mockFetchKycForms).toHaveBeenCalledTimes(1);

    // Should call again after interval
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockFetchKycForms).toHaveBeenCalledTimes(2);
  });

  it('should not start polling when autoStart is false', () => {
    renderHook(() => useKycPolling(mockQuote, 10000, false, 30));

    expect(mockFetchKycForms).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockFetchKycForms).not.toHaveBeenCalled();
  });

  it('should use custom polling interval', () => {
    renderHook(() => useKycPolling(mockQuote, 2000, true, 30));

    expect(mockFetchKycForms).toHaveBeenCalledTimes(1);

    // Should call after custom interval
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(mockFetchKycForms).toHaveBeenCalledTimes(2);
  });

  it('should return current KYC approval status', () => {
    mockSdkResponse.data = {
      isAllowedToPlaceOrder: true,
    } as DepositSdkMethodState<'getKYCForms'>['data'];

    const { result } = renderHook(() =>
      useKycPolling(mockQuote, 10000, true, 30),
    );

    expect(result.current.kycApproved).toBe(true);
  });

  it('should return false when KYC is not approved', () => {
    mockSdkResponse.data = {
      isAllowedToPlaceOrder: false,
    } as DepositSdkMethodState<'getKYCForms'>['data'];

    const { result } = renderHook(() =>
      useKycPolling(mockQuote, 10000, true, 30),
    );

    expect(result.current.kycApproved).toBe(false);
  });

  it('should stop polling when KYC is approved', () => {
    const { rerender } = renderHook(() =>
      useKycPolling(mockQuote, 10000, true, 30),
    );

    expect(mockFetchKycForms).toHaveBeenCalledTimes(1);

    mockSdkResponse.data = {
      isAllowedToPlaceOrder: true,
    } as DepositSdkMethodState<'getKYCForms'>['data'];
    rerender();

    // Should not continue polling
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockFetchKycForms).toHaveBeenCalledTimes(1);
  });

  it('should allow manual start and stop of polling', () => {
    const { result } = renderHook(() =>
      useKycPolling(mockQuote, 10000, false, 30),
    );

    expect(mockFetchKycForms).not.toHaveBeenCalled();

    act(() => {
      result.current.startPolling();
    });
    expect(mockFetchKycForms).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.stopPolling();
    });

    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockFetchKycForms).toHaveBeenCalledTimes(1);
  });

  it('should cleanup polling on unmount', () => {
    const { unmount } = renderHook(() =>
      useKycPolling(mockQuote, 10000, true, 30),
    );

    expect(mockFetchKycForms).toHaveBeenCalledTimes(1);

    unmount();

    // Should not continue polling after unmount
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockFetchKycForms).toHaveBeenCalledTimes(1);
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

    expect(mockFetchKycForms).toHaveBeenCalledTimes(1);

    // First interval call
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(mockFetchKycForms).toHaveBeenCalledTimes(2);

    // Second interval call should stop and set error without calling fetchKycForms
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(mockFetchKycForms).toHaveBeenCalledTimes(2);
    expect(result.current.error).toContain(
      'KYC polling reached maximum attempts',
    );
  });
});

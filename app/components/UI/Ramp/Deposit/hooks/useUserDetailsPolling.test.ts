import { renderHook, act } from '@testing-library/react-hooks';
import useUserDetailsPolling from './useUserDetailsPolling';
import {
  DepositSdkMethodState,
  useDepositSdkMethod,
} from './useDepositSdkMethod';
import { useDepositSDK } from '../sdk';
import {
  NativeRampsSdk,
  NativeTransakAccessToken,
} from '@consensys/native-ramps-sdk';
import {
  DepositRegion,
  DEBIT_CREDIT_PAYMENT_METHOD,
  USDC_TOKEN,
  USD_CURRENCY,
} from '../constants';

jest.mock('./useDepositSdkMethod');
jest.mock('../sdk');

const mockUseDepositSdkMethod = useDepositSdkMethod as jest.MockedFunction<
  typeof useDepositSdkMethod
>;

const mockUseDepositSDK = useDepositSDK as jest.MockedFunction<
  typeof useDepositSDK
>;

const mockFetchUserDetails = jest.fn();
const mockSdkResponse: DepositSdkMethodState<'getUserDetails'> = {
  data: null,
  error: null,
  isFetching: false,
};

jest.useFakeTimers();

describe('useUserDetailsPolling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSdkResponse.data = null;
    mockSdkResponse.error = null;
    mockSdkResponse.isFetching = false;
    mockUseDepositSdkMethod.mockReturnValue([
      mockSdkResponse,
      mockFetchUserDetails,
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
      selectedRegion: {
        isoCode: 'US',
      } as DepositRegion,
      setSelectedRegion: jest.fn(),
      paymentMethod: DEBIT_CREDIT_PAYMENT_METHOD,
      setPaymentMethod: jest.fn(),
      cryptoCurrency: USDC_TOKEN,
      setCryptoCurrency: jest.fn(),
      fiatCurrency: USD_CURRENCY,
      setFiatCurrency: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should start polling automatically by default', () => {
    renderHook(() => useUserDetailsPolling(10000, true, 30));

    // Should call immediately
    expect(mockFetchUserDetails).toHaveBeenCalledTimes(1);

    // Should call again after interval
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockFetchUserDetails).toHaveBeenCalledTimes(2);
  });

  it('should not start polling when autoStart is false', () => {
    renderHook(() => useUserDetailsPolling(10000, false, 30));

    expect(mockFetchUserDetails).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockFetchUserDetails).not.toHaveBeenCalled();
  });

  it('should use custom polling interval', () => {
    renderHook(() => useUserDetailsPolling(2000, true, 30));

    expect(mockFetchUserDetails).toHaveBeenCalledTimes(1);

    // Should call after custom interval
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(mockFetchUserDetails).toHaveBeenCalledTimes(2);
  });

  it('should return userDetails and status', () => {
    mockSdkResponse.data = {
      id: 'id',
      firstName: 'First',
      lastName: 'Last',
      email: 'test@example.com',
      mobileNumber: '+1234567890',
      status: 'active',
      dob: '1990-01-01',
      address: {
        addressLine1: '123 Main St',
        addressLine2: 'Apt 4',
        city: 'Test City',
        state: 'TS',
        country: 'US',
        countryCode: 'US',
        postCode: '12345',
      },
      createdAt: '2023-01-01T00:00:00Z',
      kyc: {
        status: 'APPROVED',
        type: 'L1',
        workFlowRunId: 'test-workflow-id',
        attempts: [],
        highestApprovedKYCType: 'L1',
        kycMarkedBy: null,
        kycResult: null,
        rejectionDetails: null,
        userId: 'test-user',
      },
    };

    const { result } = renderHook(() => useUserDetailsPolling(10000, true, 30));

    expect(result.current.userDetails).toEqual({
      id: 'id',
      firstName: 'First',
      lastName: 'Last',
      email: 'test@example.com',
      mobileNumber: '+1234567890',
      status: 'active',
      dob: '1990-01-01',
      address: {
        addressLine1: '123 Main St',
        addressLine2: 'Apt 4',
        city: 'Test City',
        state: 'TS',
        country: 'US',
        countryCode: 'US',
        postCode: '12345',
      },
      createdAt: '2023-01-01T00:00:00Z',
      kyc: {
        status: 'APPROVED',
        type: 'L1',
        workFlowRunId: 'test-workflow-id',
        attempts: [],
        highestApprovedKYCType: 'L1',
        kycMarkedBy: null,
        kycResult: null,
        rejectionDetails: null,
        userId: 'test-user',
      },
    });
  });

  it('should stop polling when status is not NOT_SUBMITTED or SUBMITTED', () => {
    const { rerender } = renderHook(() =>
      useUserDetailsPolling(10000, true, 30),
    );

    expect(mockFetchUserDetails).toHaveBeenCalledTimes(1);

    mockSdkResponse.data = {
      id: 'id',
      firstName: 'First',
      lastName: 'Last',
      email: 'test@example.com',
      mobileNumber: '+1234567890',
      status: 'active',
      dob: '1990-01-01',
      address: {
        addressLine1: '123 Main St',
        addressLine2: 'Apt 4',
        city: 'Test City',
        state: 'TS',
        country: 'US',
        countryCode: 'US',
        postCode: '12345',
      },
      createdAt: '2023-01-01T00:00:00Z',
      kyc: {
        status: 'APPROVED',
        type: 'L1',
        workFlowRunId: 'test-workflow-id',
        attempts: [],
        highestApprovedKYCType: 'L1',
        kycMarkedBy: null,
        kycResult: null,
        rejectionDetails: null,
        userId: 'test-user',
      },
    };
    rerender();

    // Should not continue polling
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockFetchUserDetails).toHaveBeenCalledTimes(1);
  });

  it('should allow manual start and stop of polling', () => {
    const { result } = renderHook(() =>
      useUserDetailsPolling(10000, false, 30),
    );

    expect(mockFetchUserDetails).not.toHaveBeenCalled();

    act(() => {
      result.current.startPolling();
    });
    expect(mockFetchUserDetails).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.stopPolling();
    });

    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockFetchUserDetails).toHaveBeenCalledTimes(1);
  });

  it('should cleanup polling on unmount', () => {
    const { unmount } = renderHook(() =>
      useUserDetailsPolling(10000, true, 30),
    );

    expect(mockFetchUserDetails).toHaveBeenCalledTimes(1);

    unmount();

    // Should not continue polling after unmount
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockFetchUserDetails).toHaveBeenCalledTimes(1);
  });

  it('should pass through loading and error states', () => {
    mockSdkResponse.isFetching = true;
    mockSdkResponse.error = 'Network error';

    const { result } = renderHook(() => useUserDetailsPolling(10000, true, 30));

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe('Network error');
  });

  it('should stop polling after max attempts', () => {
    const { result } = renderHook(() => useUserDetailsPolling(1000, true, 2));

    expect(mockFetchUserDetails).toHaveBeenCalledTimes(1);

    // First interval call
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(mockFetchUserDetails).toHaveBeenCalledTimes(2);

    // Second interval call should stop and set error without calling fetchUserDetails
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(mockFetchUserDetails).toHaveBeenCalledTimes(2);
    expect(result.current.error).toContain(
      'User details polling reached maximum attempts',
    );
  });

  it('should poll indefinitely when maxPollingAttempts is 0', () => {
    const { result } = renderHook(() => useUserDetailsPolling(1000, true, 0));

    expect(mockFetchUserDetails).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 50; i++) {
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    }

    expect(mockFetchUserDetails).toHaveBeenCalledTimes(51);
    expect(result.current.error).toBeNull();
  });
});

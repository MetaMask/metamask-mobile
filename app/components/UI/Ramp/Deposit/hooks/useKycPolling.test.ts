import { renderHook, act } from '@testing-library/react-hooks';
import useKycPolling from './useKycPolling';
import { useDepositSdkMethod } from './useDepositSdkMethod';

jest.mock('./useDepositSdkMethod');

const mockUseDepositSdkMethod = useDepositSdkMethod as jest.MockedFunction<
  typeof useDepositSdkMethod
>;

interface KycDetails {
  kyc?: {
    l1?: {
      status?: string;
    };
  };
}

const mockGetUserDetails = jest.fn();
const mockSdkResponse = {
  sdkMethod: mockGetUserDetails,
  response: null as KycDetails | null,
  loading: false,
  error: null as string | null,
};

jest.useFakeTimers();

describe('useKycPolling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDepositSdkMethod.mockReturnValue(mockSdkResponse);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should start polling automatically by default', () => {
    renderHook(() => useKycPolling());

    // Should call immediately
    expect(mockGetUserDetails).toHaveBeenCalledTimes(1);

    // Should call again after interval
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(mockGetUserDetails).toHaveBeenCalledTimes(2);
  });

  it('should not start polling when autoStart is false', () => {
    renderHook(() => useKycPolling(5000, false));

    expect(mockGetUserDetails).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(mockGetUserDetails).not.toHaveBeenCalled();
  });

  it('should use custom polling interval', () => {
    renderHook(() => useKycPolling(2000));

    expect(mockGetUserDetails).toHaveBeenCalledTimes(1);

    // Should call after custom interval
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(mockGetUserDetails).toHaveBeenCalledTimes(2);
  });

  it('should return current KYC response', () => {
    const mockKycData = {
      l1: {
        status: 'SUBMITTED',
      },
    };

    mockSdkResponse.response = {
      kyc: mockKycData,
    };

    const { result } = renderHook(() => useKycPolling());

    expect(result.current.kycResponse).toEqual(mockKycData);
  });

  it('should return null when no KYC data', () => {
    mockSdkResponse.response = {
      kyc: undefined,
    };

    const { result } = renderHook(() => useKycPolling());

    expect(result.current.kycResponse).toBe(null);
  });

  it('should stop polling when status is APPROVED', () => {
    const { rerender } = renderHook(() => useKycPolling());

    mockSdkResponse.response = {
      kyc: {
        l1: {
          status: 'SUBMITTED',
        },
      },
    };
    rerender();

    expect(mockGetUserDetails).toHaveBeenCalledTimes(1);

    mockSdkResponse.response = {
      kyc: {
        l1: {
          status: 'APPROVED',
        },
      },
    };
    rerender();

    // Should not continue polling
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(mockGetUserDetails).toHaveBeenCalledTimes(1);
  });

  it('should stop polling when status is REJECTED', () => {
    const { rerender } = renderHook(() => useKycPolling());

    mockSdkResponse.response = {
      kyc: {
        l1: {
          status: 'SUBMITTED',
        },
      },
    };
    rerender();

    expect(mockGetUserDetails).toHaveBeenCalledTimes(1);

    mockSdkResponse.response = {
      kyc: {
        l1: {
          status: 'REJECTED',
        },
      },
    };
    rerender();

    // Should not continue polling
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(mockGetUserDetails).toHaveBeenCalledTimes(1);
  });

  it('should allow manual start and stop of polling', () => {
    const { result } = renderHook(() => useKycPolling(5000, false));

    expect(mockGetUserDetails).not.toHaveBeenCalled();

    act(() => {
      result.current.startPolling();
    });
    expect(mockGetUserDetails).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.stopPolling();
    });

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(mockGetUserDetails).toHaveBeenCalledTimes(1);
  });

  it('should cleanup polling on unmount', () => {
    const { unmount } = renderHook(() => useKycPolling());

    expect(mockGetUserDetails).toHaveBeenCalledTimes(1);

    unmount();

    // Should not continue polling after unmount
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(mockGetUserDetails).toHaveBeenCalledTimes(1);
  });

  it('should pass through loading and error states', () => {
    mockSdkResponse.loading = true;
    mockSdkResponse.error = 'Network error';

    const { result } = renderHook(() => useKycPolling());

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe('Network error');
  });
});

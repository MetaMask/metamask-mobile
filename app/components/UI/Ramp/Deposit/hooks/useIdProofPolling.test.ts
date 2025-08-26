import { renderHook, act } from '@testing-library/react-hooks';
import useIdProofPolling from './useIdProofPolling';
import {
  DepositSdkMethodState,
  useDepositSdkMethod,
} from './useDepositSdkMethod';
import { useDepositSDK } from '../sdk';
import {
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

const mockGetKycWorkflowRunStatus = jest.fn();
const mockSdkResponse: DepositSdkMethodState<'getKycWorkflowRunStatus'> = {
  data: null,
  error: null,
  isFetching: false,
};

const mockTestWorkflowId = 'test-workflow-id';

jest.useFakeTimers();

describe('useIdProofPolling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSdkResponse.data = null;
    mockSdkResponse.error = null;
    mockSdkResponse.isFetching = false;
    mockUseDepositSdkMethod.mockReturnValue([
      mockSdkResponse,
      mockGetKycWorkflowRunStatus,
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
    renderHook(() => useIdProofPolling(mockTestWorkflowId, 10000, true, 30));

    // Should call immediately
    expect(mockGetKycWorkflowRunStatus).toHaveBeenCalledTimes(1);

    // Should call again after interval
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockGetKycWorkflowRunStatus).toHaveBeenCalledTimes(2);
  });

  it('should not start polling when autoStart is false', () => {
    renderHook(() => useIdProofPolling(mockTestWorkflowId, 10000, false, 30));

    expect(mockGetKycWorkflowRunStatus).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockGetKycWorkflowRunStatus).not.toHaveBeenCalled();
  });

  it('should use custom polling interval', () => {
    renderHook(() => useIdProofPolling(mockTestWorkflowId, 2000, true, 30));

    expect(mockGetKycWorkflowRunStatus).toHaveBeenCalledTimes(1);

    // Should call after custom interval
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(mockGetKycWorkflowRunStatus).toHaveBeenCalledTimes(2);
  });

  it('should return current idProofStatus submitted status', () => {
    mockSdkResponse.data = {
      status: 'SUBMITTED',
    } as DepositSdkMethodState<'getKycWorkflowRunStatus'>['data'];

    const { result } = renderHook(() =>
      useIdProofPolling(mockTestWorkflowId, 10000, true, 30),
    );

    expect(result.current.idProofStatus).toBe('SUBMITTED');
  });

  it('should return current idProofStatus not submitted status', () => {
    mockSdkResponse.data = {
      status: 'NOT_SUBMITTED',
    } as DepositSdkMethodState<'getKycWorkflowRunStatus'>['data'];

    const { result } = renderHook(() =>
      useIdProofPolling(mockTestWorkflowId, 10000, true, 30),
    );

    expect(result.current.idProofStatus).toBe('NOT_SUBMITTED');
  });

  it('should stop polling when idProofStatus is submitted', () => {
    const { rerender } = renderHook(() =>
      useIdProofPolling(mockTestWorkflowId, 10000, true, 30),
    );

    expect(mockGetKycWorkflowRunStatus).toHaveBeenCalledTimes(1);

    mockSdkResponse.data = {
      status: 'SUBMITTED',
    } as DepositSdkMethodState<'getKycWorkflowRunStatus'>['data'];
    rerender();

    // Should not continue polling
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockGetKycWorkflowRunStatus).toHaveBeenCalledTimes(1);
  });

  it('should allow manual start and stop of polling', () => {
    const { result } = renderHook(() =>
      useIdProofPolling(mockTestWorkflowId, 10000, false, 30),
    );

    expect(mockGetKycWorkflowRunStatus).not.toHaveBeenCalled();

    act(() => {
      result.current.startPolling();
    });
    expect(mockGetKycWorkflowRunStatus).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.stopPolling();
    });

    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockGetKycWorkflowRunStatus).toHaveBeenCalledTimes(1);
  });

  it('should cleanup polling on unmount', () => {
    const { unmount } = renderHook(() =>
      useIdProofPolling(mockTestWorkflowId, 10000, true, 30),
    );

    expect(mockGetKycWorkflowRunStatus).toHaveBeenCalledTimes(1);

    unmount();

    // Should not continue polling after unmount
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockGetKycWorkflowRunStatus).toHaveBeenCalledTimes(1);
  });

  it('should pass through loading and error states', () => {
    mockSdkResponse.isFetching = true;
    mockSdkResponse.error = 'Network error';

    const { result } = renderHook(() =>
      useIdProofPolling(mockTestWorkflowId, 10000, true, 30),
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe('Network error');
  });

  it('should stop polling after max attempts', () => {
    const { result } = renderHook(() =>
      useIdProofPolling(mockTestWorkflowId, 1000, true, 2),
    );

    expect(mockGetKycWorkflowRunStatus).toHaveBeenCalledTimes(1);

    // First interval call
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(mockGetKycWorkflowRunStatus).toHaveBeenCalledTimes(2);

    // Second interval call should stop and set error without calling fetchKycForms
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(mockGetKycWorkflowRunStatus).toHaveBeenCalledTimes(2);
    expect(result.current.error).toContain(
      'Kyc workflow polling reached maximum attempts. Please try again later.',
    );
  });
});

import { renderHook, act } from '@testing-library/react-hooks';
import React from 'react';
import useKycPolling from './useKycPolling';
import { useDepositSdkMethod } from './useDepositSdkMethod';
import { useDepositSDK } from '../sdk';

jest.mock('./useDepositSdkMethod');
jest.mock('../sdk');

const mockUseDepositSdkMethod = useDepositSdkMethod as jest.MockedFunction<
  typeof useDepositSdkMethod
>;

const mockUseDepositSDK = useDepositSDK as jest.MockedFunction<
  typeof useDepositSDK
>;

const mockFetchKycForms = jest.fn();
const mockSdkResponse = {
  data: null as any,
  error: null as string | null,
  isFetching: false,
};

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
      quote: { id: 'test-quote' },
      sdk: {} as any,
      sdkError: undefined,
      providerApiKey: 'test-key',
      providerFrontendAuth: 'test-auth',
      email: 'test@test.com',
      setEmail: jest.fn(),
      isAuthenticated: true,
      authToken: { token: 'test-token' } as any,
      setAuthToken: jest.fn(),
      checkExistingToken: jest.fn(),
      setQuote: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should start polling automatically by default', () => {
    renderHook(() => useKycPolling());

    // Should call immediately
    expect(mockFetchKycForms).toHaveBeenCalledTimes(1);

    // Should call again after interval
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockFetchKycForms).toHaveBeenCalledTimes(2);
  });

  it('should not start polling when autoStart is false', () => {
    renderHook(() => useKycPolling(10000, false));

    expect(mockFetchKycForms).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockFetchKycForms).not.toHaveBeenCalled();
  });

  it('should use custom polling interval', () => {
    renderHook(() => useKycPolling(2000));

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
    };

    const { result } = renderHook(() => useKycPolling());

    expect(result.current.kycApproved).toBe(true);
  });

  it('should return false when KYC is not approved', () => {
    mockSdkResponse.data = {
      isAllowedToPlaceOrder: false,
    };

    const { result } = renderHook(() => useKycPolling());

    expect(result.current.kycApproved).toBe(false);
  });

  it('should stop polling when KYC is approved', () => {
    const { rerender } = renderHook(() => useKycPolling());

    expect(mockFetchKycForms).toHaveBeenCalledTimes(1);

    mockSdkResponse.data = {
      isAllowedToPlaceOrder: true,
    };
    rerender();

    // Should not continue polling
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockFetchKycForms).toHaveBeenCalledTimes(1);
  });

  it('should allow manual start and stop of polling', () => {
    const { result } = renderHook(() => useKycPolling(10000, false));

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
    const { unmount } = renderHook(() => useKycPolling());

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

    const { result } = renderHook(() => useKycPolling());

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe('Network error');
  });

  it('should stop polling after max attempts', () => {
    const { result } = renderHook(() => useKycPolling(1000, true, 2));

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

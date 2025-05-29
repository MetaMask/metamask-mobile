import { renderHook, act } from '@testing-library/react-hooks';
import { useDepositSdkMethod } from './useDepositSdkMethod';
import { useDepositSDK } from '../sdk';

jest.mock('../sdk', () => ({
  useDepositSDK: jest.fn(),
}));

describe('useDepositSdkMethod', () => {
  const mockSdk = {
    sdk: {
      sendUserOtp: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useDepositSDK as jest.Mock).mockReturnValue(mockSdk);
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() =>
      useDepositSdkMethod('sendUserOtp', 'test@email.com'),
    );

    expect(result.current.response).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.sdkMethod).toBe('function');
  });

  it('should set loading to true when sdkMethod is called', async () => {
    mockSdk.sdk.sendUserOtp.mockResolvedValue('mock response');

    const { result } = renderHook(() =>
      useDepositSdkMethod('sendUserOtp', 'test@email.com'),
    );

    act(() => {
      result.current.sdkMethod();
    });

    expect(result.current.loading).toBe(true);
  });

  it('should set response and reset loading when sdkMethod resolves', async () => {
    mockSdk.sdk.sendUserOtp.mockResolvedValue('mock response');

    const { result, waitForNextUpdate } = renderHook(() =>
      useDepositSdkMethod('sendUserOtp', 'test@email.com'),
    );

    act(() => {
      result.current.sdkMethod();
    });

    expect(result.current.loading).toBe(true);

    await waitForNextUpdate();

    expect(result.current.response).toBe('mock response');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockSdk.sdk.sendUserOtp).toHaveBeenCalledWith('test@email.com');
  });

  it('should handle errors when SDK method fails', async () => {
    const errorMessage = 'Something went wrong';
    mockSdk.sdk.sendUserOtp.mockRejectedValue(new Error(errorMessage));

    const { result, waitForNextUpdate } = renderHook(() =>
      useDepositSdkMethod('sendUserOtp', 'test@email.com'),
    );

    act(() => {
      result.current.sdkMethod();
    });

    await waitForNextUpdate();

    expect(result.current.response).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(errorMessage);
  });

  it('should handle errors when SDK is not initialized', async () => {
    (useDepositSDK as jest.Mock).mockReturnValue({ sdk: null });

    const { result } = renderHook(() =>
      useDepositSdkMethod('sendUserOtp', 'test@email.com'),
    );

    act(() => {
      result.current.sdkMethod();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Deposit SDK is not initialized');
    expect(result.current.response).toBeNull();
  });
});

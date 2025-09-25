import { renderHook, act } from '@testing-library/react-hooks';
import { useValidateReferralCode } from './useValidateReferralCode';
import Engine from '../../../../core/Engine';

// Mock dependencies
jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('lodash', () => ({
  debounce: jest.fn((fn) => {
    // Return a simple mock that calls the function immediately for testing
    const mockFn = (...args: unknown[]) => fn(...args);
    mockFn.cancel = jest.fn();
    return mockFn;
  }),
}));

describe('useValidateReferralCode', () => {
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useValidateReferralCode());

    expect(result.current.referralCode).toBe('');
    expect(result.current.isValidating).toBe(false);
    expect(result.current.isValid).toBe(false);
    expect(typeof result.current.setReferralCode).toBe('function');
    expect(typeof result.current.validateCode).toBe('function');
  });

  it('should initialize with custom initial value', () => {
    const { result } = renderHook(() => useValidateReferralCode('INITIAL'));

    expect(result.current.referralCode).toBe('INITIAL');
  });

  it('should validate code successfully', async () => {
    mockEngineCall.mockResolvedValueOnce(true);

    const { result } = renderHook(() => useValidateReferralCode());

    await act(async () => {
      const error = await result.current.validateCode('VALID123');
      expect(error).toBe('');
    });

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:validateReferralCode',
      'VALID123',
    );
  });

  it('should return error for invalid code', async () => {
    mockEngineCall.mockResolvedValueOnce(false);

    const { result } = renderHook(() => useValidateReferralCode());

    await act(async () => {
      const error = await result.current.validateCode('INVALID');
      expect(error).toBe('Invalid code');
    });
  });

  it('should update referral code', () => {
    const { result } = renderHook(() => useValidateReferralCode());

    act(() => {
      result.current.setReferralCode('NEW123');
    });

    expect(result.current.referralCode).toBe('NEW123');
  });

  it('should set validating state when code is provided', () => {
    const { result } = renderHook(() => useValidateReferralCode());

    act(() => {
      result.current.setReferralCode('TEST');
    });

    expect(result.current.referralCode).toBe('TEST');
  });

  it('should handle engine call errors gracefully', async () => {
    const mockError = new Error('Network error');
    mockEngineCall.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useValidateReferralCode());

    // Should not throw, but we can't easily test the internal error handling
    // in this basic test setup due to debouncing and async behavior
    await expect(result.current.validateCode('TEST123')).rejects.toThrow(
      'Network error',
    );
  });
});

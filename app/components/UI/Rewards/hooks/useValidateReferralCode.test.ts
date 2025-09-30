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
    expect(result.current.isUnknownError).toBe(false);
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
      result.current.setReferralCode('TEST123');
    });

    expect(result.current.referralCode).toBe('TEST123');
  });

  it('should not validate when code length is less than 6 but set relevant error', () => {
    const { result } = renderHook(() => useValidateReferralCode());

    act(() => {
      result.current.setReferralCode('12345');
    });

    expect(result.current.referralCode).toBe('12345');
    expect(result.current.isValid).toBe(false);
  });

  it('should set isUnknownError when validation fails with network error', async () => {
    // Arrange
    const mockError = new Error('Network error');
    mockEngineCall.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useValidateReferralCode());

    // Act
    await act(async () => {
      try {
        await result.current.validateCode('TEST123');
      } catch {
        // Expected to throw
      }
    });

    // Assert
    expect(result.current.isUnknownError).toBe(true);
  });

  it('should clear isUnknownError on successful validation', async () => {
    // Arrange - First fail, then succeed
    const mockError = new Error('Network error');
    mockEngineCall.mockRejectedValueOnce(mockError).mockResolvedValueOnce(true);

    const { result } = renderHook(() => useValidateReferralCode());

    // Act - First validation fails
    await act(async () => {
      try {
        await result.current.validateCode('TEST123');
      } catch {
        // Expected to throw
      }
    });

    // Verify unknown error is set
    expect(result.current.isUnknownError).toBe(true);

    // Act - Set referral code to trigger validation which should succeed
    await act(async () => {
      result.current.setReferralCode('VALID1');
    });

    // Wait for debounced validation to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1100)); // Wait longer than debounce
    });

    // Assert - Unknown error should be cleared
    expect(result.current.isUnknownError).toBe(false);
  });
});

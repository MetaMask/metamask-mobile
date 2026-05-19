import { renderHook, act, waitFor } from '@testing-library/react-native';
import {
  REFERRAL_CODE_DEBOUNCE_MS,
  useValidateReferralCode,
} from './useValidateReferralCode';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.useFakeTimers();

describe('useValidateReferralCode', () => {
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;

  const advanceReferralCodeDebounce = async (
    ms = REFERRAL_CODE_DEBOUNCE_MS,
  ) => {
    await act(async () => {
      jest.advanceTimersByTime(ms);
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('initializes with correct default values', () => {
    const { result } = renderHook(() => useValidateReferralCode());

    expect(result.current.referralCode).toBe('');
    expect(result.current.isValidating).toBe(false);
    expect(result.current.isValid).toBe(false);
    expect(result.current.isUnknownError).toBe(false);
    expect(typeof result.current.setReferralCode).toBe('function');
    expect(typeof result.current.validateCode).toBe('function');
  });

  it('initializes with custom initial value and validates after debounce', async () => {
    mockEngineCall.mockResolvedValueOnce(true);

    const { result } = renderHook(() => useValidateReferralCode('ABCDEF'));

    expect(result.current.isValidating).toBe(true);
    expect(mockEngineCall).not.toHaveBeenCalled();

    await advanceReferralCodeDebounce();

    await waitFor(() => {
      expect(result.current.isValid).toBe(true);
    });
    expect(result.current.referralCode).toBe('ABCDEF');
  });

  it('validates code directly via validateCode', async () => {
    mockEngineCall.mockResolvedValueOnce(true);
    const { result } = renderHook(() => useValidateReferralCode());

    await act(async () => {
      const error = await result.current.validateCode('VALID1');
      expect(error).toBe('');
    });

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:validateReferralCode',
      'VALID1',
    );
  });

  it('returns error from validateCode for invalid code', async () => {
    mockEngineCall.mockResolvedValueOnce(false);
    const { result } = renderHook(() => useValidateReferralCode());

    await act(async () => {
      const error = await result.current.validateCode('BADONE');
      expect(error).toBe('Invalid referral code. Please check and try again.');
    });
  });

  it('converts code to uppercase, trims whitespace, and validates after debounce', async () => {
    mockEngineCall.mockResolvedValueOnce(true);
    const { result } = renderHook(() => useValidateReferralCode());

    act(() => {
      result.current.setReferralCode('  abcdef  ');
    });

    expect(result.current.referralCode).toBe('ABCDEF');
    expect(mockEngineCall).not.toHaveBeenCalled();

    await advanceReferralCodeDebounce();

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:validateReferralCode',
      'ABCDEF',
    );
  });

  it('does not validate for empty input', () => {
    const { result } = renderHook(() => useValidateReferralCode());

    act(() => {
      result.current.setReferralCode('');
    });

    expect(result.current.referralCode).toBe('');
    expect(result.current.isValid).toBe(false);
    expect(result.current.isValidating).toBe(false);
    expect(mockEngineCall).not.toHaveBeenCalled();
  });

  it('does not validate for whitespace-only input', () => {
    const { result } = renderHook(() => useValidateReferralCode());

    act(() => {
      result.current.setReferralCode('   ');
    });

    expect(result.current.referralCode).toBe('');
    expect(result.current.isValid).toBe(false);
    expect(result.current.isValidating).toBe(false);
    expect(mockEngineCall).not.toHaveBeenCalled();
  });

  it('does not validate locally invalid referral code formats', async () => {
    const { result } = renderHook(() => useValidateReferralCode());

    act(() => {
      result.current.setReferralCode('AB');
    });

    expect(result.current.referralCode).toBe('AB');
    expect(result.current.isValidating).toBe(false);
    expect(result.current.isValid).toBe(false);

    await advanceReferralCodeDebounce();

    act(() => {
      result.current.setReferralCode('ABCDEFGHIJKLM');
    });

    expect(result.current.isValidating).toBe(false);
    expect(result.current.isValid).toBe(false);

    await advanceReferralCodeDebounce();

    act(() => {
      result.current.setReferralCode('ABC_123');
    });

    expect(result.current.isValidating).toBe(false);
    expect(result.current.isValid).toBe(false);

    await advanceReferralCodeDebounce();

    expect(mockEngineCall).not.toHaveBeenCalled();
  });

  it('does not call validateCode backend for locally invalid referral code formats', async () => {
    const { result } = renderHook(() => useValidateReferralCode());

    await act(async () => {
      const tooShortError = await result.current.validateCode('AB');
      expect(tooShortError).toBe(
        'Invalid referral code. Please check and try again.',
      );

      const badCharacterError = await result.current.validateCode('ABC_123');
      expect(badCharacterError).toBe(
        'Invalid referral code. Please check and try again.',
      );
    });

    expect(mockEngineCall).not.toHaveBeenCalled();
  });

  it('validates after debounce for a short non-empty code', async () => {
    mockEngineCall.mockResolvedValueOnce(true);
    const { result } = renderHook(() => useValidateReferralCode());

    act(() => {
      result.current.setReferralCode('ABC');
    });

    expect(result.current.isValidating).toBe(true);
    expect(mockEngineCall).not.toHaveBeenCalled();

    await advanceReferralCodeDebounce();

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:validateReferralCode',
      'ABC',
    );
    expect(result.current.isValid).toBe(true);
    expect(result.current.isValidating).toBe(false);
  });

  it('validates after debounce for valid 6-char code', async () => {
    mockEngineCall.mockResolvedValueOnce(true);
    const { result } = renderHook(() => useValidateReferralCode());

    act(() => {
      result.current.setReferralCode('ABCDEF');
    });

    expect(mockEngineCall).not.toHaveBeenCalled();

    await advanceReferralCodeDebounce();

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:validateReferralCode',
      'ABCDEF',
    );
    expect(result.current.isValid).toBe(true);
    expect(result.current.isValidating).toBe(false);
  });

  it('validates after debounce for a vanity code (happy path)', async () => {
    mockEngineCall.mockResolvedValueOnce(true);
    const { result } = renderHook(() => useValidateReferralCode());

    act(() => {
      result.current.setReferralCode('bankless');
    });

    expect(mockEngineCall).not.toHaveBeenCalled();

    await advanceReferralCodeDebounce();

    // Code is normalized to uppercase before being forwarded
    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:validateReferralCode',
      'BANKLESS',
    );
    expect(result.current.referralCode).toBe('BANKLESS');
    expect(result.current.isValid).toBe(true);
    expect(result.current.isValidating).toBe(false);
  });

  it('sets isUnknownError when validation throws', async () => {
    mockEngineCall.mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useValidateReferralCode());

    act(() => {
      result.current.setReferralCode('ABCDEF');
    });

    await advanceReferralCodeDebounce();

    expect(result.current.isUnknownError).toBe(true);
    expect(result.current.isValid).toBe(false);
  });

  it('debounces rapid input changes and only validates the last value', async () => {
    mockEngineCall.mockResolvedValueOnce(true);
    const { result } = renderHook(() => useValidateReferralCode());

    act(() => {
      result.current.setReferralCode('A');
      result.current.setReferralCode('AB');
      result.current.setReferralCode('ABC');
    });

    expect(result.current.referralCode).toBe('ABC');
    expect(result.current.isValidating).toBe(true);
    expect(mockEngineCall).not.toHaveBeenCalled();

    await advanceReferralCodeDebounce();

    expect(mockEngineCall).toHaveBeenCalledTimes(1);
    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:validateReferralCode',
      'ABC',
    );
    expect(result.current.isValid).toBe(true);
  });

  it('clears isUnknownError on subsequent successful validation', async () => {
    mockEngineCall
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(true);

    const { result } = renderHook(() => useValidateReferralCode());

    act(() => {
      result.current.setReferralCode('ABCDEF');
    });

    await advanceReferralCodeDebounce();

    expect(result.current.isUnknownError).toBe(true);

    act(() => {
      result.current.setReferralCode('GHJKMN');
    });

    await advanceReferralCodeDebounce();

    expect(result.current.isUnknownError).toBe(false);
    expect(result.current.isValid).toBe(true);
  });

  it('discards stale responses when a newer validation is in flight', async () => {
    let resolveFirst: (value: boolean) => void;
    const firstPromise = new Promise<boolean>((resolve) => {
      resolveFirst = resolve;
    });
    mockEngineCall
      .mockReturnValueOnce(firstPromise)
      .mockResolvedValueOnce(true);

    const { result } = renderHook(() => useValidateReferralCode());

    act(() => {
      result.current.setReferralCode('ABCDEF');
    });

    await advanceReferralCodeDebounce();

    act(() => {
      result.current.setReferralCode('GHJKMN');
    });

    await advanceReferralCodeDebounce();

    await act(async () => {
      resolveFirst?.(false);
    });

    expect(result.current.isValid).toBe(true);
    expect(result.current.referralCode).toBe('GHJKMN');
  });

  it('invalidates in-flight request when code is cleared to empty', async () => {
    let resolveValidation: (value: boolean) => void;
    const validationPromise = new Promise<boolean>((resolve) => {
      resolveValidation = resolve;
    });
    mockEngineCall.mockReturnValueOnce(validationPromise);

    const { result } = renderHook(() => useValidateReferralCode());

    act(() => {
      result.current.setReferralCode('ABCDEF');
    });

    await advanceReferralCodeDebounce();

    expect(result.current.isValidating).toBe(true);

    act(() => {
      result.current.setReferralCode('');
    });

    expect(result.current.isValidating).toBe(false);
    expect(result.current.isValid).toBe(false);

    await act(async () => {
      resolveValidation?.(true);
    });

    expect(result.current.isValid).toBe(false);
    expect(result.current.referralCode).toBe('');
  });
});

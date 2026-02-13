import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import {
  useValidateBonusCode,
  BONUS_CODE_MIN_LENGTH,
  BONUS_CODE_MAX_LENGTH,
  BONUS_CODE_DEBOUNCE_MS,
} from './useValidateBonusCode';
import Engine from '../../../../core/Engine';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

describe('useValidateBonusCode', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;

  const mockSubscriptionId = 'test-subscription-id';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseSelector.mockReturnValue(mockSubscriptionId);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes with correct default values', () => {
    const { result } = renderHook(() => useValidateBonusCode());

    expect(result.current.bonusCode).toBe('');
    expect(result.current.isValidating).toBe(false);
    expect(result.current.isValid).toBe(false);
    expect(result.current.isUnknownError).toBe(false);
    expect(result.current.error).toBe('');
    expect(typeof result.current.setBonusCode).toBe('function');
  });

  it('does not trigger validation for codes shorter than minimum length', () => {
    const { result } = renderHook(() => useValidateBonusCode());

    act(() => {
      result.current.setBonusCode('AB');
    });
    jest.advanceTimersByTime(BONUS_CODE_DEBOUNCE_MS);

    expect(result.current.bonusCode).toBe('AB');
    expect(result.current.isValid).toBe(false);
    expect(result.current.isValidating).toBe(false);
    expect(mockEngineCall).not.toHaveBeenCalled();
  });

  it('does not trigger validation for codes longer than maximum length', () => {
    const { result } = renderHook(() => useValidateBonusCode());
    const longCode = 'A'.repeat(BONUS_CODE_MAX_LENGTH + 1);

    act(() => {
      result.current.setBonusCode(longCode);
    });
    jest.advanceTimersByTime(BONUS_CODE_DEBOUNCE_MS);

    expect(result.current.isValidating).toBe(false);
    expect(mockEngineCall).not.toHaveBeenCalled();
  });

  it('converts code to uppercase and trims whitespace', async () => {
    mockEngineCall.mockResolvedValueOnce(true);
    const { result } = renderHook(() => useValidateBonusCode());

    act(() => {
      result.current.setBonusCode('  abcd  ');
    });

    expect(result.current.bonusCode).toBe('ABCD');

    await act(async () => {
      jest.advanceTimersByTime(BONUS_CODE_DEBOUNCE_MS);
    });

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:validateBonusCode',
      'ABCD',
      mockSubscriptionId,
    );
  });

  it('triggers debounced validation at minimum length', async () => {
    mockEngineCall.mockResolvedValueOnce(true);
    const { result } = renderHook(() => useValidateBonusCode());
    const code = 'A'.repeat(BONUS_CODE_MIN_LENGTH);

    act(() => {
      result.current.setBonusCode(code);
    });

    expect(result.current.isValidating).toBe(true);
    expect(mockEngineCall).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(BONUS_CODE_DEBOUNCE_MS);
    });

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:validateBonusCode',
      code,
      mockSubscriptionId,
    );
  });

  it('triggers debounced validation at maximum length', async () => {
    mockEngineCall.mockResolvedValueOnce(true);
    const { result } = renderHook(() => useValidateBonusCode());
    const code = 'B'.repeat(BONUS_CODE_MAX_LENGTH);

    act(() => {
      result.current.setBonusCode(code);
    });

    await act(async () => {
      jest.advanceTimersByTime(BONUS_CODE_DEBOUNCE_MS);
    });

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:validateBonusCode',
      code,
      mockSubscriptionId,
    );
  });

  it('validates successfully for a valid bonus code', async () => {
    mockEngineCall.mockResolvedValueOnce(true);
    const { result } = renderHook(() => useValidateBonusCode());

    act(() => {
      result.current.setBonusCode('BNS123');
    });

    await act(async () => {
      jest.advanceTimersByTime(BONUS_CODE_DEBOUNCE_MS);
    });

    expect(result.current.isValid).toBe(true);
    expect(result.current.isValidating).toBe(false);
    expect(result.current.error).toBe('');
    expect(result.current.isUnknownError).toBe(false);
  });

  it('sets error when validation returns false', async () => {
    mockEngineCall.mockResolvedValueOnce(false);
    const { result } = renderHook(() => useValidateBonusCode());

    act(() => {
      result.current.setBonusCode('BNS123');
    });

    await act(async () => {
      jest.advanceTimersByTime(BONUS_CODE_DEBOUNCE_MS);
    });

    expect(result.current.isValid).toBe(false);
    expect(result.current.isValidating).toBe(false);
    expect(result.current.error).toBe(
      'rewards.error_messages.invalid_bonus_code',
    );
  });

  it('sets error when no subscription ID is available', async () => {
    mockUseSelector.mockReturnValue(null);
    const { result } = renderHook(() => useValidateBonusCode());

    act(() => {
      result.current.setBonusCode('BNS123');
    });

    await act(async () => {
      jest.advanceTimersByTime(BONUS_CODE_DEBOUNCE_MS);
    });

    expect(result.current.isValid).toBe(false);
    expect(result.current.error).toBe(
      'No subscription found. Please try again.',
    );
    expect(mockEngineCall).not.toHaveBeenCalled();
  });

  it('sets isUnknownError when validation throws', async () => {
    mockEngineCall.mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useValidateBonusCode());

    act(() => {
      result.current.setBonusCode('BNS123');
    });

    await act(async () => {
      jest.advanceTimersByTime(BONUS_CODE_DEBOUNCE_MS);
    });

    expect(result.current.isUnknownError).toBe(true);
    expect(result.current.isValid).toBe(false);
    expect(result.current.isValidating).toBe(false);
  });

  it('clears error and unknownError when code changes', async () => {
    mockEngineCall.mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useValidateBonusCode());

    act(() => {
      result.current.setBonusCode('BNS123');
    });

    await act(async () => {
      jest.advanceTimersByTime(BONUS_CODE_DEBOUNCE_MS);
    });

    expect(result.current.isUnknownError).toBe(true);

    act(() => {
      result.current.setBonusCode('XYZ');
    });

    expect(result.current.isUnknownError).toBe(false);
    expect(result.current.error).toBe('');
  });

  it('debounces rapid input changes and only validates the last value', async () => {
    mockEngineCall.mockResolvedValue(true);
    const { result } = renderHook(() => useValidateBonusCode());

    act(() => {
      result.current.setBonusCode('ABCD');
    });

    act(() => {
      jest.advanceTimersByTime(BONUS_CODE_DEBOUNCE_MS / 2);
    });

    act(() => {
      result.current.setBonusCode('EFGH');
    });

    await act(async () => {
      jest.advanceTimersByTime(BONUS_CODE_DEBOUNCE_MS);
    });

    expect(mockEngineCall).toHaveBeenCalledTimes(1);
    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:validateBonusCode',
      'EFGH',
      mockSubscriptionId,
    );
  });

  it('discards stale responses when a newer validation is in flight', async () => {
    let resolveFirst: (value: boolean) => void;
    const firstPromise = new Promise<boolean>((resolve) => {
      resolveFirst = resolve;
    });
    mockEngineCall
      .mockReturnValueOnce(firstPromise)
      .mockResolvedValueOnce(true);

    const { result } = renderHook(() => useValidateBonusCode());

    act(() => {
      result.current.setBonusCode('CODE1');
    });

    await act(async () => {
      jest.advanceTimersByTime(BONUS_CODE_DEBOUNCE_MS);
    });

    act(() => {
      result.current.setBonusCode('CODE2');
    });

    await act(async () => {
      jest.advanceTimersByTime(BONUS_CODE_DEBOUNCE_MS);
    });

    await act(async () => {
      resolveFirst?.(false);
    });

    expect(result.current.isValid).toBe(true);
    expect(result.current.error).toBe('');
  });

  it('resets isValidating when code drops below minimum length', async () => {
    mockEngineCall.mockResolvedValueOnce(true);
    const { result } = renderHook(() => useValidateBonusCode());

    act(() => {
      result.current.setBonusCode('ABCD');
    });

    expect(result.current.isValidating).toBe(true);

    act(() => {
      result.current.setBonusCode('AB');
    });

    expect(result.current.isValidating).toBe(false);
    jest.advanceTimersByTime(BONUS_CODE_DEBOUNCE_MS);
    expect(mockEngineCall).not.toHaveBeenCalled();
  });
});

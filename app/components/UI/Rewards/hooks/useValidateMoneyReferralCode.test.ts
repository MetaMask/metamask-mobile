import { renderHook, act, waitFor } from '@testing-library/react-native';
import {
  MONEY_REFERRAL_CODE_DEBOUNCE_MS,
  useValidateMoneyReferralCode,
} from './useValidateMoneyReferralCode';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.useFakeTimers();

describe('useValidateMoneyReferralCode', () => {
  const mockEngineCall = Engine.controllerMessenger.call as jest.Mock;

  const advanceDebounce = async (ms = MONEY_REFERRAL_CODE_DEBOUNCE_MS) => {
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

  it('initializes with empty code and no validation state', () => {
    const { result } = renderHook(() => useValidateMoneyReferralCode());

    expect(result.current.referralCode).toBe('');
    expect(result.current.isValidating).toBe(false);
    expect(result.current.isValid).toBe(false);
    expect(result.current.isUnknownError).toBe(false);
    expect(typeof result.current.setReferralCode).toBe('function');
    expect(typeof result.current.validateCode).toBe('function');
  });

  it('does not expose a VIP flag', () => {
    const { result } = renderHook(() => useValidateMoneyReferralCode());

    expect(result.current).not.toHaveProperty('isVipReferralCode');
  });

  it('trims and uppercases the code before validating it', async () => {
    mockEngineCall.mockResolvedValueOnce({ success: true });
    const { result } = renderHook(() => useValidateMoneyReferralCode());

    act(() => {
      result.current.setReferralCode('  kol1  ');
    });

    expect(result.current.referralCode).toBe('KOL1');
    expect(mockEngineCall).not.toHaveBeenCalled();

    await advanceDebounce();

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsMoneyController:validateReferralCode',
      'KOL1',
    );
    expect(result.current.isValid).toBe(true);
    expect(result.current.isValidating).toBe(false);
  });

  it('validates through the Money controller from validateCode', async () => {
    mockEngineCall.mockResolvedValueOnce({ success: true });
    const { result } = renderHook(() => useValidateMoneyReferralCode());

    await act(async () => {
      const error = await result.current.validateCode('kol1');
      expect(error).toBe('');
    });

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsMoneyController:validateReferralCode',
      'KOL1',
    );
  });

  it('reports an invalid code from validateCode when the server says success false', async () => {
    mockEngineCall.mockResolvedValueOnce({ success: false });
    const { result } = renderHook(() => useValidateMoneyReferralCode());

    await act(async () => {
      const error = await result.current.validateCode('KOL1');
      expect(error).toBe('Invalid referral code. Please check and try again.');
    });
  });

  it('returns an unknown error from validateCode when the call throws', async () => {
    mockEngineCall.mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useValidateMoneyReferralCode());

    await act(async () => {
      const error = await result.current.validateCode('KOL1');
      expect(error).toBe('Unknown error');
    });
  });

  it('accepts a 24 character alphanumeric code', async () => {
    mockEngineCall.mockResolvedValueOnce({ success: true });
    const code = 'A'.repeat(23) + '9';
    const { result } = renderHook(() => useValidateMoneyReferralCode());

    act(() => {
      result.current.setReferralCode(code);
    });

    await advanceDebounce();

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsMoneyController:validateReferralCode',
      code,
    );
    expect(result.current.isValid).toBe(true);
  });

  it.each([
    ['too short', 'AB'],
    ['longer than 24 characters', 'A'.repeat(25)],
    ['hyphenated', 'KOL-1'],
    ['underscored', 'KOL_1'],
  ])('does not call the backend for a %s code', async (_label, code) => {
    const { result } = renderHook(() => useValidateMoneyReferralCode());

    act(() => {
      result.current.setReferralCode(code);
    });

    expect(result.current.isValidating).toBe(false);
    expect(result.current.isValid).toBe(false);

    await advanceDebounce();

    expect(mockEngineCall).not.toHaveBeenCalled();
  });

  it('does not call the backend from validateCode for a locally invalid code', async () => {
    const { result } = renderHook(() => useValidateMoneyReferralCode());

    await act(async () => {
      expect(await result.current.validateCode('AB')).toBe(
        'Invalid referral code. Please check and try again.',
      );
      expect(await result.current.validateCode('KOL-1')).toBe(
        'Invalid referral code. Please check and try again.',
      );
      expect(await result.current.validateCode('A'.repeat(25))).toBe(
        'Invalid referral code. Please check and try again.',
      );
    });

    expect(mockEngineCall).not.toHaveBeenCalled();
  });

  it('validates an initial value after the debounce', async () => {
    mockEngineCall.mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useValidateMoneyReferralCode('KOL1'));

    expect(result.current.isValidating).toBe(true);
    expect(mockEngineCall).not.toHaveBeenCalled();

    await advanceDebounce();

    await waitFor(() => {
      expect(result.current.isValid).toBe(true);
    });
    expect(result.current.referralCode).toBe('KOL1');
  });

  it('marks the code invalid when the server rejects it after the debounce', async () => {
    mockEngineCall.mockResolvedValueOnce({ success: false });
    const { result } = renderHook(() => useValidateMoneyReferralCode());

    act(() => {
      result.current.setReferralCode('KOL1');
    });

    await advanceDebounce();

    await waitFor(() => {
      expect(result.current.isValid).toBe(false);
    });
    expect(result.current.isUnknownError).toBe(false);
  });

  it('sets isUnknownError when validation throws after the debounce', async () => {
    mockEngineCall.mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useValidateMoneyReferralCode());

    act(() => {
      result.current.setReferralCode('KOL1');
    });

    await advanceDebounce();

    expect(result.current.isUnknownError).toBe(true);
    expect(result.current.isValid).toBe(false);
  });

  it('debounces rapid input and only validates the last value', async () => {
    mockEngineCall.mockResolvedValueOnce({ success: true });
    const { result } = renderHook(() => useValidateMoneyReferralCode());

    act(() => {
      result.current.setReferralCode('KO');
      result.current.setReferralCode('KOL');
      result.current.setReferralCode('KOL1');
    });

    expect(result.current.referralCode).toBe('KOL1');
    expect(result.current.isValidating).toBe(true);

    await advanceDebounce();

    expect(mockEngineCall).toHaveBeenCalledTimes(1);
    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsMoneyController:validateReferralCode',
      'KOL1',
    );
  });

  it('discards a stale response when a newer validation is in flight', async () => {
    let resolveFirst: (value: { success: boolean }) => void = () => undefined;
    const firstResponse = new Promise<{ success: boolean }>((resolve) => {
      resolveFirst = resolve;
    });
    mockEngineCall
      .mockReturnValueOnce(firstResponse)
      .mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useValidateMoneyReferralCode());

    act(() => {
      result.current.setReferralCode('KOL1');
    });
    await advanceDebounce();

    act(() => {
      result.current.setReferralCode('KOL2');
    });
    await advanceDebounce();

    await act(async () => {
      resolveFirst({ success: false });
    });

    expect(result.current.referralCode).toBe('KOL2');
    expect(result.current.isValid).toBe(true);
  });

  it('discards an in-flight response when the code is cleared', async () => {
    let resolveValidation: (value: { success: boolean }) => void = () =>
      undefined;
    const response = new Promise<{ success: boolean }>((resolve) => {
      resolveValidation = resolve;
    });
    mockEngineCall.mockReturnValueOnce(response);

    const { result } = renderHook(() => useValidateMoneyReferralCode());

    act(() => {
      result.current.setReferralCode('KOL1');
    });
    await advanceDebounce();

    expect(result.current.isValidating).toBe(true);

    act(() => {
      result.current.setReferralCode('');
    });

    expect(result.current.isValidating).toBe(false);

    await act(async () => {
      resolveValidation({ success: true });
    });

    expect(result.current.referralCode).toBe('');
    expect(result.current.isValid).toBe(false);
  });

  it('clears isUnknownError on a later successful validation', async () => {
    mockEngineCall
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useValidateMoneyReferralCode());

    act(() => {
      result.current.setReferralCode('KOL1');
    });
    await advanceDebounce();

    expect(result.current.isUnknownError).toBe(true);

    act(() => {
      result.current.setReferralCode('KOL2');
    });
    await advanceDebounce();

    expect(result.current.isUnknownError).toBe(false);
    expect(result.current.isValid).toBe(true);
  });
});

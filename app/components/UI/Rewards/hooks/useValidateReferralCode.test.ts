import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useValidateReferralCode } from './useValidateReferralCode';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

describe('useValidateReferralCode', () => {
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('initializes with custom initial value and validates immediately', async () => {
    mockEngineCall.mockResolvedValueOnce(true);

    const { result } = renderHook(() => useValidateReferralCode('ABCDEF'));

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

  it('converts code to uppercase and trims whitespace', async () => {
    mockEngineCall.mockResolvedValueOnce(true);
    const { result } = renderHook(() => useValidateReferralCode());

    await act(async () => {
      result.current.setReferralCode('  abcdef  ');
    });

    expect(result.current.referralCode).toBe('ABCDEF');
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

  it('validates immediately for a short non-empty code', async () => {
    mockEngineCall.mockResolvedValueOnce(true);
    const { result } = renderHook(() => useValidateReferralCode());

    await act(async () => {
      result.current.setReferralCode('ABC');
    });

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:validateReferralCode',
      'ABC',
    );
    expect(result.current.isValid).toBe(true);
    expect(result.current.isValidating).toBe(false);
  });

  it('validates immediately for valid 6-char code', async () => {
    mockEngineCall.mockResolvedValueOnce(true);
    const { result } = renderHook(() => useValidateReferralCode());

    await act(async () => {
      result.current.setReferralCode('ABCDEF');
    });

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:validateReferralCode',
      'ABCDEF',
    );
    expect(result.current.isValid).toBe(true);
    expect(result.current.isValidating).toBe(false);
  });

  it('validates immediately for a vanity code (happy path)', async () => {
    mockEngineCall.mockResolvedValueOnce(true);
    const { result } = renderHook(() => useValidateReferralCode());

    await act(async () => {
      result.current.setReferralCode('bankless');
    });

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

    await act(async () => {
      result.current.setReferralCode('ABCDEF');
    });

    expect(result.current.isUnknownError).toBe(true);
    expect(result.current.isValid).toBe(false);
  });

  it('clears isUnknownError on subsequent successful validation', async () => {
    mockEngineCall
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(true);

    const { result } = renderHook(() => useValidateReferralCode());

    await act(async () => {
      result.current.setReferralCode('ABCDEF');
    });

    expect(result.current.isUnknownError).toBe(true);

    await act(async () => {
      result.current.setReferralCode('GHJKMN');
    });

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

    await act(async () => {
      result.current.setReferralCode('GHJKMN');
    });

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

import { renderHook, act } from '@testing-library/react-hooks';
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

    const { result, waitForNextUpdate } = renderHook(() =>
      useValidateReferralCode('ABCDEF'),
    );

    await waitForNextUpdate();

    expect(result.current.referralCode).toBe('ABCDEF');
    expect(result.current.isValid).toBe(true);
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

  it('does not validate when code is shorter than 6 characters', () => {
    const { result } = renderHook(() => useValidateReferralCode());

    act(() => {
      result.current.setReferralCode('ABC');
    });

    expect(result.current.referralCode).toBe('ABC');
    expect(result.current.isValid).toBe(false);
    expect(result.current.isValidating).toBe(false);
    expect(mockEngineCall).not.toHaveBeenCalled();
  });

  it('does not validate when code is longer than 6 characters', () => {
    const { result } = renderHook(() => useValidateReferralCode());

    act(() => {
      result.current.setReferralCode('ABCDEFG');
    });

    expect(result.current.isValid).toBe(false);
    expect(result.current.isValidating).toBe(false);
    expect(mockEngineCall).not.toHaveBeenCalled();
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

  it('invalidates in-flight request when code length changes away from 6', async () => {
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
      result.current.setReferralCode('ABCDE');
    });

    expect(result.current.isValidating).toBe(false);
    expect(result.current.isValid).toBe(false);

    await act(async () => {
      resolveValidation?.(true);
    });

    expect(result.current.isValid).toBe(false);
    expect(result.current.referralCode).toBe('ABCDE');
  });
});

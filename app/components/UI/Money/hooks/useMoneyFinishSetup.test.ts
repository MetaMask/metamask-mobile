import { act, renderHook } from '@testing-library/react-native';
import { useDispatch, useSelector } from 'react-redux';
import { STEPPER_IDS } from './useOnboardingStep';
import { useMoneyFinishSetup } from './useMoneyFinishSetup';

const mockDispatch = jest.fn();
let mockIsSocialLogin = false;

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('./useMoneySecurityMethods', () => ({
  useMoneySecurityMethods: () => ({
    isSocialLogin: mockIsSocialLogin,
  }),
}));

describe('useMoneyFinishSetup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSocialLogin = false;
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
    (useSelector as jest.Mock).mockImplementation(
      (selector: (state: object) => unknown) =>
        selector({
          user: {
            onboardingStepperProgress: {
              [STEPPER_IDS.MONEY_FINISH_SETUP]: 63,
              [STEPPER_IDS.MONEY_PASSKEY_COUNT]: 1,
              [STEPPER_IDS.MONEY_SECURITY_AUTHENTICATOR]: 1,
              [STEPPER_IDS.MONEY_SECURITY_SOCIAL]: 1,
              [STEPPER_IDS.MONEY_TRANSACTION_VERIFICATION]: 1,
            },
            moneyPasskeyNames: { 0: 'Work passkey' },
            moneyEmail: 'stored@metamask.com',
          },
        }),
    );
  });

  it('excludes the recovery task for SRP users without shifting stored bits', () => {
    const { result } = renderHook(() => useMoneyFinishSetup());

    expect(result.current.totalTasks).toBe(4);
    expect(result.current.completedCount).toBe(4);
    expect(result.current.tasks.map((task) => task.id)).toEqual([
      'add_money',
      'secure_money',
      'pro_benefits',
      'get_card',
    ]);
  });

  it('retains the recovery task for social-login users', () => {
    mockIsSocialLogin = true;
    const { result } = renderHook(() => useMoneyFinishSetup());

    expect(result.current.totalTasks).toBe(5);
    expect(result.current.completedCount).toBe(5);
  });

  it('resets all prototype security methods and settings', () => {
    const { result } = renderHook(() => useMoneyFinishSetup());

    act(() => result.current.resetProgress());

    const expectedSteps = [
      [STEPPER_IDS.MONEY_FINISH_SETUP, 0],
      [STEPPER_IDS.MONEY_PASSKEY_COUNT, 0],
      [STEPPER_IDS.MONEY_SECURITY_AUTHENTICATOR, 0],
      [STEPPER_IDS.MONEY_SECURITY_AUTHENTICATOR_CREATED_AT, 0],
      [STEPPER_IDS.MONEY_SECURITY_SOCIAL, 0],
      [STEPPER_IDS.MONEY_SECURITY_SOCIAL_PROVIDER, 0],
      [STEPPER_IDS.MONEY_SECURITY_SOCIAL_CREATED_AT, 0],
      [STEPPER_IDS.MONEY_SECURITY_SOCIAL_REMOVED, 1],
      [STEPPER_IDS.MONEY_SECURITY_SMS_REMOVED, 1],
      [STEPPER_IDS.MONEY_SECURITY_SMS_CREATED_AT, 0],
      [STEPPER_IDS.MONEY_TRANSACTION_VERIFICATION, 0],
      [STEPPER_IDS.MONEY_RECOVERY_VERIFICATION_PENDING, 0],
      [STEPPER_IDS.MONEY_RECOVERY_PROTOTYPE_COMPLETED, 0],
      [STEPPER_IDS.MONEY_TWO_WEEKS_LATER, 0],
      [STEPPER_IDS.MONEY_EMAIL_VERIFIED, 0],
      [STEPPER_IDS.MONEY_PROTECTION_ANIMATION_TRIGGER, 0],
    ] as const;

    for (const [stepperId, step] of expectedSteps) {
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: { stepperId, step },
        }),
      );
    }

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { names: {} } }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { phoneNumber: '' } }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { email: '' } }),
    );
  });

  it('funds the prototype account when Add funds is completed', () => {
    const { result } = renderHook(() => useMoneyFinishSetup());

    act(() => result.current.fundPrototypeAccount());

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          stepperId: STEPPER_IDS.MONEY_RECOVERY_PROTOTYPE_COMPLETED,
          step: 1,
        },
      }),
    );
  });

  it('advances the prototype by two weeks', () => {
    const { result } = renderHook(() => useMoneyFinishSetup());

    act(() => result.current.advanceTwoWeeks());

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          stepperId: STEPPER_IDS.MONEY_TWO_WEEKS_LATER,
          step: 1,
        },
      }),
    );
  });

  it('marks email verification as complete', () => {
    const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(123456789);
    const { result } = renderHook(() => useMoneyFinishSetup());

    act(() => result.current.markEmailVerified('cool@gmail.com'));

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { email: 'cool@gmail.com' },
      }),
    );

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          stepperId: STEPPER_IDS.MONEY_EMAIL_VERIFIED,
          step: 1,
        },
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          stepperId: STEPPER_IDS.MONEY_TRANSACTION_VERIFICATION,
          step: 1,
        },
      }),
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          stepperId: STEPPER_IDS.MONEY_PROTECTION_ANIMATION_TRIGGER,
        }),
      }),
    );
    dateNowSpy.mockRestore();
  });

  it('enables transaction verification when a passkey is registered', () => {
    const { result } = renderHook(() => useMoneyFinishSetup());

    act(() => result.current.registerPasskey('icloud'));

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          stepperId: STEPPER_IDS.MONEY_TRANSACTION_VERIFICATION,
          step: 1,
        },
      }),
    );
  });
});

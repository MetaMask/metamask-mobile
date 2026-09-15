import { act, renderHook } from '@testing-library/react-native';
import { useDispatch, useSelector } from 'react-redux';
import { STEPPER_IDS } from './useOnboardingStep';
import { useMoneyFinishSetup } from './useMoneyFinishSetup';

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

describe('useMoneyFinishSetup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
          },
        }),
    );
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

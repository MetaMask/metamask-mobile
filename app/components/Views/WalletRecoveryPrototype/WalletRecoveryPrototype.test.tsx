import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, within } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Routes from '../../../constants/navigation/Routes';
import { ToastContext } from '../../../component-library/components/Toast';
import WalletRecoveryPrototype from './WalletRecoveryPrototype';
import { WalletRecoveryPrototypeTestIds } from './WalletRecoveryPrototype.testIds';
import { STEPPER_IDS } from '../../UI/Money/hooks/useOnboardingStep';
import { MONEY_SMS_DEMO_PHONE_NUMBER } from '../../UI/Money/constants/moneySms';

const mockCloseBottomSheet = jest.fn((callback?: () => void) => callback?.());
const mockGoBack = jest.fn();
const mockReplace = jest.fn();
const mockShowToast = jest.fn();
let mockRouteParams: {
  initialStage: 'googlePicker' | 'verifyMoney';
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    replace: mockReplace,
  }),
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  const { Pressable, View } = jest.requireActual('react-native');

  return {
    ...actual,
    BottomSheet: forwardRef(
      (
        {
          children,
          goBack,
          testID,
        }: {
          children: React.ReactNode;
          goBack?: () => void;
          testID?: string;
        },
        ref: React.Ref<unknown>,
      ) => {
        useImperativeHandle(ref, () => ({
          onCloseBottomSheet: mockCloseBottomSheet,
        }));
        return (
          <View testID={testID}>
            {children}
            <Pressable testID={`${testID}-mock-close`} onPress={goBack} />
          </View>
        );
      },
    ),
  };
});

const renderPrototype = (
  params: typeof mockRouteParams = { initialStage: 'googlePicker' },
) => {
  mockRouteParams = params;
  return renderWithProvider(
    <ToastContext.Provider
      value={{
        toastRef: {
          current: {
            showToast: mockShowToast,
            closeToast: jest.fn(),
          },
        },
      }}
    >
      <WalletRecoveryPrototype />
    </ToastContext.Provider>,
  );
};

describe('WalletRecoveryPrototype', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('shows the Face ID permission prompt before continuing to the wallet', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    const { getByTestId, getByText, store } = renderPrototype();

    fireEvent.press(getByTestId(WalletRecoveryPrototypeTestIds.GOOGLE_ACCOUNT));
    expect(getByText('alex.wallet@gmail.com')).toBeOnTheScreen();
    const verificationSheet = getByTestId(
      WalletRecoveryPrototypeTestIds.VERIFICATION_SHEET,
    );
    expect(
      within(verificationSheet).getByText('Verify it’s you'),
    ).toBeOnTheScreen();
    expect(
      within(verificationSheet).getByText('Get a verification code'),
    ).toBeOnTheScreen();
    fireEvent.press(
      within(verificationSheet).getByTestId(
        WalletRecoveryPrototypeTestIds.USE_PASSKEY,
      ),
    );
    const passkeySheet = getByTestId(
      WalletRecoveryPrototypeTestIds.PASSKEY_SHEET,
    );
    expect(within(passkeySheet).getByText('Sign in')).toBeOnTheScreen();
    expect(within(passkeySheet).getByText('Continue')).toBeOnTheScreen();
    expect(within(passkeySheet).getByText('Other options')).toBeOnTheScreen();
    fireEvent.press(
      within(passkeySheet).getByTestId(
        WalletRecoveryPrototypeTestIds.USE_PASSKEY,
      ),
    );
    act(() => jest.advanceTimersByTime(700));
    act(() => jest.advanceTimersByTime(700));

    expect(getByText('Log in with Face ID')).toBeOnTheScreen();
    expect(getByText('Use Face ID to log into your wallet.')).toBeOnTheScreen();
    expect(mockReplace).not.toHaveBeenCalled();

    fireEvent.press(getByTestId(WalletRecoveryPrototypeTestIds.ENABLE_FACE_ID));

    expect(alertSpy).toHaveBeenCalledWith(
      'Do you want to allow “MetaMask” to use Face ID?',
      'Allow MetaMask to use Face ID to unlock the app',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Don’t Allow' }),
        expect.objectContaining({ text: 'OK' }),
      ]),
    );
    const buttons = alertSpy.mock.calls[0][2];
    buttons?.[0]?.onPress?.();
    buttons?.[1]?.onPress?.();
    expect(mockReplace).toHaveBeenCalledTimes(2);
    expect(mockReplace).toHaveBeenCalledWith(Routes.ONBOARDING.HOME_NAV);
    expect(
      store.getState().user.onboardingStepperProgress[
        STEPPER_IDS.MONEY_SECURITY_SMS_REMOVED
      ],
    ).toBe(0);
    expect(
      store.getState().user.onboardingStepperProgress[
        STEPPER_IDS.MONEY_SECURITY_SMS_CREATED_AT
      ],
    ).toEqual(expect.any(Number));
    expect(store.getState().user.moneySmsPhoneNumber).toBe(
      MONEY_SMS_DEMO_PHONE_NUMBER,
    );
    expect(
      store.getState().user.onboardingStepperProgress[
        STEPPER_IDS.MONEY_RECOVERY_VERIFICATION_PENDING
      ],
    ).toBe(0);
    expect(
      store.getState().user.onboardingStepperProgress[
        STEPPER_IDS.MONEY_RECOVERY_PROTOTYPE_COMPLETED
      ],
    ).toBe(1);
    expect(
      store.getState().user.onboardingStepperProgress[
        STEPPER_IDS.MONEY_PASSKEY_COUNT
      ],
    ).toBe(1);
    expect(
      store.getState().user.onboardingStepperProgress[
        STEPPER_IDS.MONEY_SECURITY_AUTHENTICATOR
      ],
    ).toBe(1);
  });

  it('shows recovery alternatives from the simulated passkey sheet', () => {
    const { getByTestId, getByText, queryByTestId } = renderPrototype();

    fireEvent.press(getByTestId(WalletRecoveryPrototypeTestIds.GOOGLE_ACCOUNT));
    const verificationSheet = getByTestId(
      WalletRecoveryPrototypeTestIds.VERIFICATION_SHEET,
    );
    expect(
      within(verificationSheet).getByText('Verify it’s you'),
    ).toBeOnTheScreen();
    expect(
      within(verificationSheet).queryByTestId(
        WalletRecoveryPrototypeTestIds.USE_PASSWORD,
      ),
    ).toBeNull();
    fireEvent.press(
      within(verificationSheet).getByTestId(
        WalletRecoveryPrototypeTestIds.USE_PASSKEY,
      ),
    );
    fireEvent.press(getByText('Other options'));

    expect(
      getByTestId(WalletRecoveryPrototypeTestIds.VERIFICATION_SHEET),
    ).toBeOnTheScreen();
    expect(
      getByTestId(WalletRecoveryPrototypeTestIds.GET_VERIFICATION_CODE),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(WalletRecoveryPrototypeTestIds.USE_PASSWORD),
    ).toBeNull();
  });

  it('opens Money after passkey verification', () => {
    const { getByTestId, getByText, queryByTestId } = renderPrototype({
      initialStage: 'verifyMoney',
    });

    act(() => jest.advanceTimersByTime(200));
    const verificationSheet = getByTestId(
      WalletRecoveryPrototypeTestIds.VERIFICATION_SHEET,
    );
    expect(
      within(verificationSheet).getByText('Verify with Face ID'),
    ).toBeOnTheScreen();
    expect(
      within(verificationSheet).getByText(
        /Use your passkey or another method to access your Money account\./,
      ),
    ).toBeOnTheScreen();
    fireEvent.press(
      within(verificationSheet).getByTestId(
        WalletRecoveryPrototypeTestIds.USE_PASSKEY,
      ),
    );

    expect(queryByTestId(WalletRecoveryPrototypeTestIds.USE_SMS)).toBeNull();

    const passkeySheet = getByTestId(
      WalletRecoveryPrototypeTestIds.PASSKEY_SHEET,
    );
    expect(
      within(passkeySheet).getByText('Sign in to Money account'),
    ).toBeOnTheScreen();
    expect(within(passkeySheet).queryByText('Learn more')).toBeNull();
    expect(within(passkeySheet).getByText('Signing in')).toBeOnTheScreen();
    act(() => jest.advanceTimersByTime(700));
    act(() => jest.advanceTimersByTime(700));

    expect(mockGoBack).toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [
          expect.objectContaining({
            label: 'You’re signed in',
          }),
        ],
      }),
    );
  });

  it('offers a verification code as a Money verification alternative', () => {
    const { getByTestId } = renderPrototype({
      initialStage: 'verifyMoney',
    });

    act(() => jest.advanceTimersByTime(200));
    fireEvent.press(
      within(
        getByTestId(WalletRecoveryPrototypeTestIds.VERIFICATION_SHEET),
      ).getByTestId(WalletRecoveryPrototypeTestIds.GET_VERIFICATION_CODE),
    );
    fireEvent.changeText(
      getByTestId(WalletRecoveryPrototypeTestIds.CODE_INPUT),
      '123456',
    );

    expect(mockGoBack).toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [
          expect.objectContaining({
            label: 'You’re signed in',
          }),
        ],
      }),
    );
  });

  it('refresh clears loading timers without leaving recovery', () => {
    const { getByTestId, getByText, queryByText } = renderPrototype();

    fireEvent.press(getByTestId(WalletRecoveryPrototypeTestIds.GOOGLE_ACCOUNT));
    fireEvent.press(getByTestId(WalletRecoveryPrototypeTestIds.REFRESH));
    act(() => jest.advanceTimersByTime(1000));

    expect(getByText('Choose an account')).toBeOnTheScreen();
    expect(queryByText('Verify it’s you')).toBeNull();
  });
});

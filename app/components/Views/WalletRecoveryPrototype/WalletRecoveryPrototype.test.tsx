import React from 'react';
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

  it('continues from Google recovery to the real wallet route', () => {
    const { getByTestId, getByText, store } = renderPrototype();

    fireEvent.press(getByTestId(WalletRecoveryPrototypeTestIds.GOOGLE_ACCOUNT));
    expect(getByText('Finding your wallet…')).toBeOnTheScreen();

    act(() => jest.advanceTimersByTime(500));
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
    act(() => jest.advanceTimersByTime(500));
    fireEvent.press(getByText('Other options'));

    expect(getByText('Verify it’s you')).toBeOnTheScreen();
    expect(
      getByTestId(WalletRecoveryPrototypeTestIds.USE_PASSWORD),
    ).toBeOnTheScreen();
    expect(
      getByTestId(WalletRecoveryPrototypeTestIds.USE_SMS),
    ).toBeOnTheScreen();
    expect(
      getByTestId(WalletRecoveryPrototypeTestIds.USE_AUTHENTICATOR),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(WalletRecoveryPrototypeTestIds.REFRESH),
    ).not.toBeOnTheScreen();
  });

  it('opens Money after passkey verification', () => {
    const { getByTestId, queryByTestId } = renderPrototype({
      initialStage: 'verifyMoney',
    });

    act(() => jest.advanceTimersByTime(200));
    expect(queryByTestId(WalletRecoveryPrototypeTestIds.USE_SMS)).toBeNull();

    const passkeySheet = getByTestId(
      WalletRecoveryPrototypeTestIds.PASSKEY_SHEET,
    );
    expect(
      within(passkeySheet).getByText('Sign in to Money account'),
    ).toBeOnTheScreen();
    expect(within(passkeySheet).getByText('Learn more')).toBeOnTheScreen();
    expect(within(passkeySheet).queryByText('or')).toBeNull();
    expect(
      within(passkeySheet).queryByTestId(
        WalletRecoveryPrototypeTestIds.USE_PASSWORD,
      ),
    ).toBeNull();
    expect(
      within(passkeySheet).getByTestId(
        WalletRecoveryPrototypeTestIds.USE_AUTHENTICATOR,
      ),
    ).toBeOnTheScreen();
    fireEvent.press(
      within(passkeySheet).getByTestId(
        WalletRecoveryPrototypeTestIds.USE_PASSKEY,
      ),
    );
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

  it('offers authenticator as a Money verification alternative', () => {
    const { getByTestId } = renderPrototype({
      initialStage: 'verifyMoney',
    });

    act(() => jest.advanceTimersByTime(200));
    const passkeySheet = getByTestId(
      WalletRecoveryPrototypeTestIds.PASSKEY_SHEET,
    );
    fireEvent.press(
      within(passkeySheet).getByTestId(
        WalletRecoveryPrototypeTestIds.USE_AUTHENTICATOR,
      ),
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

import React from 'react';
import ResetPassword from './';
import {
  render,
  act,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react-native';
import configureMockStore from 'redux-mock-store';
import { PREVIOUS_SCREEN } from '../../../constants/navigation';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { ChoosePasswordSelectorsIDs } from '../ChoosePassword/ChoosePassword.testIds';
import { Alert, InteractionManager } from 'react-native';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import NavigationService from '../../../core/NavigationService';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { Authentication } from '../../../core';
import StorageWrapper from '../../../store/storage-wrapper';
import { BIOMETRY_TYPE, STORAGE_TYPE } from 'react-native-keychain';
import Device from '../../../util/device';
import ReduxService from '../../../core/redux/ReduxService';
import { ReduxStore } from '../../../core/redux/types';
import { recreateVaultsWithNewPassword } from '../../../core/Vault';
import { SeedlessOnboardingControllerErrorMessage } from '@metamask/seedless-onboarding-controller';
import { NavigationContainerRef } from '@react-navigation/native';

jest.mock('../../../util/metrics/TrackOnboarding/trackOnboarding');

const mockTrackOnboarding = trackOnboarding as jest.MockedFunction<
  typeof trackOnboarding
>;

const mockExportSeedPhrase = jest.fn();

jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: {
      createNewVaultAndKeychain: jest.fn().mockResolvedValue(true),
      exportSeedPhrase: () => mockExportSeedPhrase(),
    },
  },
}));

jest.mock('lottie-react-native', () => 'LottieView');

jest.mock('../../../store/storage-wrapper', () => ({
  setItem: jest.fn(),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn(),
}));

jest.mock('../../../core/Authentication', () => ({
  getType: jest.fn().mockResolvedValue({
    currentAuthType: 'passcode',
    availableBiometryType: null,
  }),
  componentAuthenticationType: jest.fn().mockResolvedValue({
    currentAuthType: 'passcode',
    availableBiometryType: null,
  }),
  getPassword: jest.fn().mockResolvedValue(null),
  resetPassword: jest.fn().mockResolvedValue(undefined),
  storePassword: jest.fn().mockResolvedValue(undefined),
  storePasswordWithFallback: jest.fn().mockResolvedValue(undefined),
  newWalletAndKeychain: jest
    .fn()
    .mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    ),
  newWalletAndRestore: jest
    .fn()
    .mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    ),
  checkIsSeedlessPasswordOutdated: jest.fn().mockResolvedValue(false),
  lockApp: jest.fn().mockResolvedValue(undefined),
  reauthenticate: jest.fn((password) =>
    Promise.resolve({ password: password ?? 'CurrentPassword123' }),
  ),
  authData: {
    currentAuthType: 'passcode',
  },
}));

jest.mock('../../../core/NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
    reset: jest.fn(),
  },
}));

jest.mock('../../../util/device', () => ({
  isIos: jest.fn(),
  isAndroid: jest.fn(),
}));

jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

const mockTrackEvent = jest.fn();
jest.mock('../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
    isEnabled: jest.fn().mockReturnValue(true),
  },
}));

const mockRunAfterInteractions = jest.fn().mockImplementation((cb) => {
  cb();
  return {
    then: (onfulfilled: () => void) => Promise.resolve(onfulfilled()),
    done: (onfulfilled: () => void, onrejected: () => void) =>
      Promise.resolve().then(onfulfilled, onrejected),
    cancel: jest.fn(),
  };
});
jest
  .spyOn(InteractionManager, 'runAfterInteractions')
  .mockImplementation(mockRunAfterInteractions);

jest.mock('../../../core/Vault', () => {
  const actual = jest.requireActual('../../../core/Vault');
  return {
    ...actual,
    recreateVaultsWithNewPassword: jest.fn(),
  };
});

const mockStore = configureMockStore();

const createState = (seedlessVault: string | null = 'vault string') => ({
  user: {
    passwordSet: true,
    seedphraseBackedUp: false,
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      SeedlessOnboardingController: {
        vault: seedlessVault,
      },
    },
  },
  security: {
    allowLoginWithRememberMe: true,
  },
});

interface ResetPasswordProps {
  route: {
    params: {
      [PREVIOUS_SCREEN]?: string;
    };
  };
  navigation: {
    setOptions: jest.Mock;
    goBack: jest.Mock;
    navigate: jest.Mock;
    push: jest.Mock;
    replace: jest.Mock;
    reset?: jest.Mock;
  };
}

const mockNavigation = {
  setOptions: jest.fn(),
  goBack: jest.fn(),
  navigate: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
  setParams: jest.fn(),
  reset: jest.fn(),
};

const defaultProps: ResetPasswordProps = {
  route: { params: { [PREVIOUS_SCREEN]: 'ChoosePassword' } },
  navigation: mockNavigation,
};

const renderComponent = (
  props: ResetPasswordProps = defaultProps,
  seedlessVault: string | null = 'vault string',
) =>
  render(
    <Provider store={mockStore(createState(seedlessVault))}>
      <ThemeContext.Provider value={mockTheme}>
        <ResetPassword {...props} />
      </ThemeContext.Provider>
    </Provider>,
  );

const flushMicrotasks = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const navigateToResetForm = async (
  seedlessVault: string | null = 'vault string',
) => {
  mockExportSeedPhrase.mockResolvedValue('test result');

  const component = renderComponent(defaultProps, seedlessVault);

  const currentPasswordInput = component.getByTestId(
    ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
  );

  await act(async () => {
    fireEvent.changeText(currentPasswordInput, 'CurrentPassword123');
  });

  const submitButton = component.getByTestId(
    ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
  );

  fireEvent.press(submitButton);

  await waitFor(() => {
    expect(
      component.getByText(strings('reset_password.password')),
    ).toBeOnTheScreen();
  });

  return component;
};

const fillResetForm = async (
  component: ReturnType<typeof renderComponent>,
  {
    newPassword = 'NewPassword123',
    confirmPassword = 'NewPassword123',
    pressCheckbox = true,
  } = {},
) => {
  const newPasswordInput = component.getByTestId(
    ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
  );
  await act(async () => {
    fireEvent.changeText(newPasswordInput, newPassword);
  });

  const confirmPasswordInput = component.getByTestId(
    ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
  );
  await act(async () => {
    fireEvent.changeText(confirmPasswordInput, confirmPassword);
  });

  if (pressCheckbox) {
    const checkbox = component.getByTestId(
      ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
    );
    await act(async () => {
      fireEvent.press(checkbox);
    });
  }
};

const submitResetForm = async (
  component: ReturnType<typeof renderComponent>,
) => {
  const submitButton = component.getByTestId(
    ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
  );
  await act(async () => {
    fireEvent.press(submitButton);
  });
};

const getWarningModalPrimaryButton = () => {
  const navMock = NavigationService.navigation.navigate as jest.Mock;
  const warningCall = navMock.mock.calls[0];
  return warningCall[1].params.onPrimaryButtonPress;
};

describe('ResetPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTrackOnboarding.mockClear();
    mockExportSeedPhrase.mockClear();
    mockTrackEvent.mockClear();
    mockNavigation.push.mockClear();
  });

  it('render matches snapshot', async () => {
    const component = renderComponent();
    await flushMicrotasks();

    expect(component.toJSON()).toMatchSnapshot();
  });

  describe('confirm current password view', () => {
    it('renders header with Change password title', async () => {
      const component = renderComponent();
      await flushMicrotasks();

      expect(
        component.getByText(strings('password_reset.change_password')),
      ).toBeOnTheScreen();
    });

    it('renders current password input and submit button', async () => {
      jest.spyOn(Device, 'isIos').mockReturnValue(true);

      const component = renderComponent();
      await flushMicrotasks();

      expect(
        component.getByTestId(ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID),
      ).toBeOnTheScreen();
      expect(
        component.getByTestId(ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID),
      ).toBeOnTheScreen();
    });

    it('navigates back when header back button is pressed', async () => {
      const component = renderComponent();
      await flushMicrotasks();

      const header = component.getByTestId('header');
      const backButton = within(header).getByTestId('button-icon');
      fireEvent.press(backButton);

      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    });

    it('transitions to reset form after entering correct current password', async () => {
      mockExportSeedPhrase.mockResolvedValue('test result');
      const component = renderComponent();

      const currentPasswordInput = component.getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      await act(async () => {
        fireEvent.changeText(currentPasswordInput, 'CurrentPassword123');
      });

      const submitButton = component.getByTestId(
        ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
      );
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(
          component.getByText(strings('reset_password.password')),
        ).toBeOnTheScreen();
      });
    });

    it('shows incorrect password warning when reauthentication fails', async () => {
      jest
        .spyOn(Authentication, 'reauthenticate')
        .mockRejectedValueOnce(new Error('Invalid password'));

      const component = renderComponent();
      await flushMicrotasks();

      const currentPasswordInput = component.getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      await act(async () => {
        fireEvent.changeText(currentPasswordInput, 'WrongPassword');
      });

      const submitButton = component.getByTestId(
        ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
      );
      await act(async () => {
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(
          component.getByText(
            strings('reveal_credential.warning_incorrect_password'),
          ),
        ).toBeOnTheScreen();
      });
    });
  });

  describe('reset password form', () => {
    it('shows password length error for short passwords after blur', async () => {
      const component = await navigateToResetForm();

      const newPasswordInput = component.getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );

      await act(async () => {
        fireEvent.changeText(newPasswordInput, '1234567');
      });

      expect(
        component.getByText(
          strings('reset_password.must_be_at_least', { number: 8 }),
        ),
      ).toBeOnTheScreen();
    });

    it('hides password length helper when password meets minimum length', async () => {
      const component = await navigateToResetForm();

      const newPasswordInput = component.getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );

      await act(async () => {
        fireEvent.changeText(newPasswordInput, '12345678');
      });

      expect(
        component.queryByText(
          strings('reset_password.must_be_at_least', { number: 8 }),
        ),
      ).toBeNull();
    });

    it('resets error state when password field is re-focused', async () => {
      const component = await navigateToResetForm();

      const newPasswordInput = component.getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );

      await act(async () => {
        fireEvent.changeText(newPasswordInput, '1234567');
      });

      await act(async () => {
        fireEvent(newPasswordInput, 'blur');
      });

      await act(async () => {
        fireEvent(newPasswordInput, 'focus');
      });

      const helperText = component.getByText(
        strings('reset_password.must_be_at_least', { number: 8 }),
      );
      expect(helperText).toBeOnTheScreen();
    });

    it('shows mismatch error when passwords differ', async () => {
      const component = await navigateToResetForm();

      const newPasswordInput = component.getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      await act(async () => {
        fireEvent.changeText(newPasswordInput, 'NewPassword123');
        fireEvent(newPasswordInput, 'SubmitEditing');
      });

      const confirmPasswordInput = component.getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );
      await act(async () => {
        fireEvent.changeText(confirmPasswordInput, 'NewPassword1');
      });

      expect(
        component.getByText(strings('choose_password.password_error')),
      ).toBeOnTheScreen();
    });

    it('preserves confirm password when new password is updated', async () => {
      const component = await navigateToResetForm();

      const newPasswordField = component.getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      await act(async () => {
        fireEvent.changeText(newPasswordField, 'NewPassword123');
      });

      const confirmPasswordField = component.getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );
      await act(async () => {
        fireEvent.changeText(confirmPasswordField, 'NewPassword123');
      });

      await act(async () => {
        fireEvent.changeText(newPasswordField, 'NewPassword');
      });

      expect(
        within(newPasswordField).getByDisplayValue('NewPassword'),
      ).toBeTruthy();
      expect(
        within(confirmPasswordField).getByDisplayValue('NewPassword123'),
      ).toBeTruthy();
    });

    it('clears confirm password when new password is emptied', async () => {
      const component = await navigateToResetForm();

      const newPasswordField = component.getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      await act(async () => {
        fireEvent.changeText(newPasswordField, 'NewPassword123');
      });

      const confirmPasswordField = component.getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );
      await act(async () => {
        fireEvent.changeText(confirmPasswordField, 'NewPassword123');
      });

      await act(async () => {
        fireEvent.changeText(newPasswordField, '');
      });

      expect(within(confirmPasswordField).getByDisplayValue('')).toBeTruthy();
    });

    it('toggles password visibility for new password field', async () => {
      const component = await navigateToResetForm();

      const newPasswordField = component.getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      await act(async () => {
        fireEvent.changeText(newPasswordField, 'NewPassword123');
      });

      const getNewPasswordTextInput = () =>
        within(newPasswordField).getByDisplayValue('NewPassword123');

      expect(getNewPasswordTextInput().props.secureTextEntry).toBe(true);

      const showIcon = component.getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_SHOW_ICON_ID,
      );
      fireEvent.press(showIcon);

      await waitFor(() => {
        expect(getNewPasswordTextInput().props.secureTextEntry).toBe(false);
      });
    });

    it('toggles password visibility for confirm password field', async () => {
      const component = await navigateToResetForm();

      const confirmPasswordField = component.getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );
      await act(async () => {
        fireEvent.changeText(confirmPasswordField, 'NewPassword123');
      });

      const getConfirmPasswordTextInput = () =>
        within(confirmPasswordField).getByDisplayValue('NewPassword123');

      expect(getConfirmPasswordTextInput().props.secureTextEntry).toBe(true);

      const showIcon = component.getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_SHOW_ICON_ID,
      );
      fireEvent.press(showIcon);

      await waitFor(() => {
        expect(getConfirmPasswordTextInput().props.secureTextEntry).toBe(false);
      });
    });

    it('toggles checkbox via label text press', async () => {
      const component = await navigateToResetForm();

      const labelText = component.getByTestId(
        ChoosePasswordSelectorsIDs.CHECKBOX_TEXT_ID,
      );
      await act(async () => {
        fireEvent.press(labelText);
      });

      await fillResetForm(component, { pressCheckbox: false });
      await submitResetForm(component);

      await waitFor(() => {
        expect(NavigationService.navigation.navigate).toHaveBeenCalled();
      });
    });

    it('displays SRP description text for non-social-login flow', async () => {
      const component = await navigateToResetForm(null);

      expect(
        component.getByText(strings('choose_password.description')),
      ).toBeOnTheScreen();
    });
  });

  describe('learn more link', () => {
    it('opens seedless support URL for seedless onboarding flow', async () => {
      const component = await navigateToResetForm();

      const learnMoreLink = component.getByTestId(
        ChoosePasswordSelectorsIDs.LEARN_MORE_LINK_ID,
      );
      await act(async () => {
        fireEvent.press(learnMoreLink);
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: 'https://support.metamask.io/configure/wallet/passwords-and-metamask/',
          title: 'support.metamask.io',
        },
      });
    });

    it('opens SRP support URL for non-seedless flow', async () => {
      const component = await navigateToResetForm(null);

      const learnMoreLink = component.getByTestId(
        ChoosePasswordSelectorsIDs.LEARN_MORE_LINK_ID,
      );
      await act(async () => {
        fireEvent.press(learnMoreLink);
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: 'https://support.metamask.io/managing-my-wallet/resetting-deleting-and-restoring/how-can-i-reset-my-password/',
          title: 'support.metamask.io',
        },
      });
    });
  });

  describe('submit and password change', () => {
    it('shows warning confirmation modal for seedless flow', async () => {
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        getState: jest.fn().mockReturnValue({
          engine: {
            backgroundState: {
              SeedlessOnboardingController: { vault: 'vault string' },
            },
          },
        }),
      } as unknown as ReduxStore);

      jest.spyOn(Authentication, 'getType').mockResolvedValue({
        currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
        availableBiometryType: BIOMETRY_TYPE.FACE_ID,
      });
      jest
        .spyOn(StorageWrapper, 'getItem')
        .mockImplementationOnce(() => Promise.resolve(BIOMETRY_TYPE.FACE_ID));

      const component = await navigateToResetForm();
      await fillResetForm(component);
      await submitResetForm(component);

      await waitFor(() => {
        expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
          Routes.MODAL.ROOT_MODAL_FLOW,
          expect.objectContaining({
            screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
            params: expect.objectContaining({
              title: strings('reset_password.warning_password_change_title'),
              type: 'error',
              icon: 'Danger',
              secondaryButtonLabel: strings(
                'reset_password.warning_password_cancel_button',
              ),
              primaryButtonLabel: strings(
                'reset_password.warning_password_change_button',
              ),
              closeOnPrimaryButtonPress: true,
              onPrimaryButtonPress: expect.any(Function),
            }),
          }),
        );
      });
    });

    it('completes non-seedless password reset and shows success notification', async () => {
      const component = await navigateToResetForm(null);
      await fillResetForm(component);
      await submitResetForm(component);

      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalledWith(
          Routes.SETTINGS.SECURITY_SETTINGS,
        );
      });

      expect(mockRunAfterInteractions).toHaveBeenCalled();
    });

    it('disables back button during loading state', async () => {
      mockNavigation.goBack.mockClear();
      jest
        .mocked(recreateVaultsWithNewPassword)
        .mockImplementationOnce(() => new Promise<void>(() => undefined));

      const component = await navigateToResetForm(null);
      await fillResetForm(component);
      await submitResetForm(component);

      await waitFor(() => {
        expect(
          component.getByText(strings('reset_password.changing_password')),
        ).toBeOnTheScreen();
      });

      const header = component.getByTestId('header');
      const backButton = within(header).getByTestId('button-icon');
      fireEvent.press(backButton);

      expect(mockNavigation.goBack).not.toHaveBeenCalled();
    });

    it('shows alert when passcode is not set', async () => {
      jest
        .mocked(recreateVaultsWithNewPassword)
        .mockRejectedValueOnce(new Error('Passcode not set.'));

      const component = await navigateToResetForm(null);
      await fillResetForm(component);
      await submitResetForm(component);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          strings('choose_password.security_alert_title'),
          strings('choose_password.security_alert_message'),
        );
      });
    });

    it('shows outdated password modal when global password is outdated before submit', async () => {
      jest
        .spyOn(Authentication, 'checkIsSeedlessPasswordOutdated')
        .mockResolvedValueOnce(true);

      NavigationService.navigation =
        mockNavigation as unknown as NavigationContainerRef;

      const component = await navigateToResetForm(null);
      await fillResetForm(component);
      await submitResetForm(component);

      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalledWith(
          Routes.MODAL.ROOT_MODAL_FLOW,
          expect.objectContaining({
            screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
            params: expect.objectContaining({
              title: strings('login.seedless_password_outdated_modal_title'),
            }),
          }),
        );
      });
    });
  });

  describe('biometry initialization', () => {
    it('sets biometry type for passcode authentication', async () => {
      jest.spyOn(Authentication, 'getType').mockResolvedValueOnce({
        currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
        availableBiometryType: undefined,
      });

      const mockStorageWrapper = jest.mocked(StorageWrapper);
      mockStorageWrapper.getItem.mockImplementation((key) => {
        if (key === '@MetaMask:passcodeDisabled')
          return Promise.resolve('TRUE');
        if (key === '@MetaMask:biometryChoiceDisabled')
          return Promise.resolve(null);
        return Promise.resolve(null);
      });

      const component = await navigateToResetForm();
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(Authentication.getType).toHaveBeenCalled();
      expect(mockStorageWrapper.getItem).toHaveBeenCalledWith(
        '@MetaMask:biometryChoiceDisabled',
      );
      expect(mockStorageWrapper.getItem).toHaveBeenCalledWith(
        '@MetaMask:passcodeDisabled',
      );
      expect(component).toBeTruthy();
    });

    it('sets biometry type and triggers reauthentication when biometrics available', async () => {
      jest.spyOn(Authentication, 'getType').mockResolvedValueOnce({
        currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
        availableBiometryType: BIOMETRY_TYPE.FACE_ID,
      });

      const mockStorageWrapper = jest.mocked(StorageWrapper);
      mockStorageWrapper.getItem.mockImplementation((key) => {
        if (key === '@MetaMask:biometryChoiceDisabled')
          return Promise.resolve('TRUE');
        if (key === '@MetaMask:passcodeDisabled') return Promise.resolve(null);
        return Promise.resolve(null);
      });

      const component = await navigateToResetForm();
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(Authentication.getType).toHaveBeenCalled();
      expect(component).toBeTruthy();
    });

    it('auto-reauthenticates with biometric credentials when available', async () => {
      jest.spyOn(Authentication, 'getType').mockResolvedValueOnce({
        currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
        availableBiometryType: BIOMETRY_TYPE.FACE_ID,
      });

      jest.spyOn(Authentication, 'getPassword').mockResolvedValueOnce({
        username: 'testUser',
        password: 'testPassword123',
        service: 'testService',
        storage: STORAGE_TYPE.AES_GCM,
      });

      const mockStorageWrapper = jest.mocked(StorageWrapper);
      mockStorageWrapper.getItem.mockImplementation((key) => {
        if (key === '@MetaMask:biometryChoice') return Promise.resolve('TRUE');
        if (key === '@MetaMask:biometryChoiceDisabled')
          return Promise.resolve(null);
        if (key === '@MetaMask:passcodeDisabled') return Promise.resolve(null);
        return Promise.resolve(null);
      });

      const component = renderComponent();

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
      });

      expect(mockStorageWrapper.getItem).toHaveBeenCalledWith(
        '@MetaMask:biometryChoiceDisabled',
      );
      expect(component).toBeTruthy();
    });
  });

  describe('seedless error handling', () => {
    const mockRecreateVaultsWithNewPassword = jest.mocked(
      recreateVaultsWithNewPassword,
    );

    const setupSeedlessErrorTest = async (errorMessage: string) => {
      mockRecreateVaultsWithNewPassword.mockClear();
      mockRecreateVaultsWithNewPassword.mockRejectedValueOnce(
        new Error(errorMessage),
      );

      jest
        .spyOn(Authentication, 'checkIsSeedlessPasswordOutdated')
        .mockResolvedValueOnce(false);

      NavigationService.navigation =
        mockNavigation as unknown as NavigationContainerRef;

      const component = await navigateToResetForm();
      await fillResetForm(component);
      await submitResetForm(component);

      expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        expect.objectContaining({
          screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
          params: expect.objectContaining({
            title: strings('reset_password.warning_password_change_title'),
            onPrimaryButtonPress: expect.any(Function),
          }),
        }),
      );

      const onPrimaryButtonPress = getWarningModalPrimaryButton();
      await act(async () => {
        await onPrimaryButtonPress();
      });

      return component;
    };

    it('shows outdated password error and locks app on confirm', async () => {
      const spyLockApp = jest
        .spyOn(Authentication, 'lockApp')
        .mockResolvedValue(undefined);

      await setupSeedlessErrorTest(
        SeedlessOnboardingControllerErrorMessage.OutdatedPassword,
      );

      expect(mockRecreateVaultsWithNewPassword).toHaveBeenCalled();
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        expect.objectContaining({
          screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
          params: expect.objectContaining({
            title: strings('login.seedless_password_outdated_modal_title'),
            description: strings(
              'login.seedless_password_outdated_modal_content',
            ),
          }),
        }),
      );

      const errorSheetCall = mockNavigation.navigate.mock.calls[1];
      const onErrorSheetPrimaryButtonPress =
        errorSheetCall[1].params.onPrimaryButtonPress;
      await act(async () => {
        await onErrorSheetPrimaryButtonPress();
      });
      expect(spyLockApp).toHaveBeenCalled();
    });

    it('shows change password error and navigates to security settings on confirm', async () => {
      await setupSeedlessErrorTest(
        SeedlessOnboardingControllerErrorMessage.InvalidAccessToken,
      );

      expect(mockRecreateVaultsWithNewPassword).toHaveBeenCalled();
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        expect.objectContaining({
          screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
          params: expect.objectContaining({
            title: strings(
              'reset_password.seedless_change_password_error_modal_title',
            ),
            description: strings(
              'reset_password.seedless_change_password_error_modal_content',
            ),
          }),
        }),
      );

      const errorSheetCall = mockNavigation.navigate.mock.calls[1];
      const onErrorSheetPrimaryButtonPress =
        errorSheetCall[1].params.onPrimaryButtonPress;
      await act(async () => {
        await onErrorSheetPrimaryButtonPress();
      });
      expect(mockNavigation.replace).toHaveBeenCalledWith(
        Routes.SETTINGS.SECURITY_SETTINGS,
      );
    });
  });

  describe('biometry choice storage', () => {
    it('completes reset password flow when auth type is not biometric', async () => {
      const component = await navigateToResetForm();
      await fillResetForm(component);
      await submitResetForm(component);

      await waitFor(() => {
        expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
          Routes.MODAL.ROOT_MODAL_FLOW,
          expect.objectContaining({
            screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
          }),
        );
      });

      const onPrimaryButtonPress = getWarningModalPrimaryButton();
      await act(async () => {
        await onPrimaryButtonPress();
      });
    });

    it('completes reset password flow when auth type is biometric', async () => {
      const mockAuthModule = jest.requireMock('../../../core/Authentication');
      const originalAuthData = mockAuthModule.authData;
      mockAuthModule.authData = {
        currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
      };

      const component = await navigateToResetForm();
      await fillResetForm(component);
      await submitResetForm(component);

      await waitFor(() => {
        expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
          Routes.MODAL.ROOT_MODAL_FLOW,
          expect.objectContaining({
            screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
          }),
        );
      });

      const onPrimaryButtonPress = getWarningModalPrimaryButton();
      await act(async () => {
        await onPrimaryButtonPress();
      });

      mockAuthModule.authData = originalAuthData;
    });
  });
});

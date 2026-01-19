import React from 'react';
import ResetPassword from './';
import { render, act, fireEvent, waitFor } from '@testing-library/react-native';
import configureMockStore from 'redux-mock-store';
import { PREVIOUS_SCREEN } from '../../../constants/navigation';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { ChoosePasswordSelectorsIDs } from '../ChoosePassword/ChoosePassword.testIds';
import { InteractionManager } from 'react-native';
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
import type { RootParamList } from '../../../types/navigation';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';

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

const mockUpdateAuthTypeStorageFlags = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../util/authentication', () => ({
  ...jest.requireActual('../../../util/authentication'),
  updateAuthTypeStorageFlags: (biometryChoice: boolean) =>
    mockUpdateAuthTypeStorageFlags(biometryChoice),
}));

jest.mock('../../../store/storage-wrapper', () => ({
  setItem: jest.fn(),
  getItem: jest.fn().mockResolvedValue(null), // Mock to return null to avoid biometrics interference
  removeItem: jest.fn(),
}));

jest.mock('../../../core/Authentication', () => ({
  getType: jest.fn().mockResolvedValue({
    currentAuthType: 'passcode',
    availableBiometryType: null, // Disable biometrics to avoid interference
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

const mockMetricsIsEnabled = jest.fn().mockReturnValue(true);
const mockTrackEvent = jest.fn();
jest.mock('../../../core/Analytics/MetaMetrics', () => ({
  getInstance: () => ({
    isEnabled: mockMetricsIsEnabled,
    trackEvent: mockTrackEvent,
    updateDataRecordingFlag: jest.fn(),
  }),
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

const mockStore = configureMockStore();
const initialState = {
  user: {
    passwordSet: true,
    seedphraseBackedUp: false,
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      SeedlessOnboardingController: {
        vault: 'vault string',
      },
    },
  },
  security: {
    allowLoginWithRememberMe: true,
  },
};

const store = mockStore(initialState);

const initialStateWithoutSeedlessOnboardingLoginFlow = {
  user: {
    passwordSet: true,
    seedphraseBackedUp: false,
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      SeedlessOnboardingController: {
        vault: null,
      },
    },
  },
  security: {
    allowLoginWithRememberMe: true,
  },
};

const storeWithoutSeedlessOnboardingLoginFlow = mockStore(
  initialStateWithoutSeedlessOnboardingLoginFlow,
);
interface ResetPasswordProps {
  route: {
    params: {
      [PREVIOUS_SCREEN]?: string;
    };
  };
  navigation?: {
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

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <Provider store={store}>
      <ThemeContext.Provider value={mockTheme}>{ui}</ThemeContext.Provider>
    </Provider>,
  );

const renderWithProvidersWithoutSeedlessOnboardingLoginFlow = (
  ui: React.ReactElement,
) =>
  render(
    <Provider store={storeWithoutSeedlessOnboardingLoginFlow}>
      <ThemeContext.Provider value={mockTheme}>{ui}</ThemeContext.Provider>
    </Provider>,
  );

const defaultProps: ResetPasswordProps = {
  route: { params: { [PREVIOUS_SCREEN]: 'ChoosePassword' } },
  navigation: mockNavigation,
};

jest.mock('../../../core/Vault', () => {
  const actual = jest.requireActual('../../../core/Vault');
  return {
    ...actual,
    recreateVaultsWithNewPassword: jest.fn(),
  };
});

describe('ResetPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTrackOnboarding.mockClear();
    mockExportSeedPhrase.mockClear();
    mockTrackEvent.mockClear();
    // Reset the navigation mocks to ensure they're properly tracked
    mockNavigation.push.mockClear();
  });

  const renderConfirmPasswordView = async (
    isSeedlessOnboardingLoginFlow = true,
  ) => {
    // Test the mock directly to ensure it's working
    mockExportSeedPhrase.mockResolvedValue('test result');

    const component = isSeedlessOnboardingLoginFlow
      ? renderWithProviders(<ResetPassword {...defaultProps} />)
      : renderWithProvidersWithoutSeedlessOnboardingLoginFlow(
          <ResetPassword {...defaultProps} />,
        );

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

  it('render matches snapshot', async () => {
    const component = renderWithProviders(<ResetPassword {...defaultProps} />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(component.toJSON()).toMatchSnapshot();
  });

  it('renders the current password view initially', async () => {
    jest.spyOn(Device, 'isIos').mockReturnValue(true);

    const component = renderWithProviders(<ResetPassword {...defaultProps} />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Verify we're in the confirm password view
    const currentPasswordInput = component.getByTestId(
      ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
    );
    const submitButton = component.getByTestId(
      ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
    );

    expect(currentPasswordInput).toBeOnTheScreen();
    expect(submitButton).toBeOnTheScreen();
  });

  it('renders the new password view after entering the current password', async () => {
    // Test the mock directly to ensure it's working
    mockExportSeedPhrase.mockResolvedValue('test result');

    const component = renderWithProviders(<ResetPassword {...defaultProps} />);

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

  it('correctly navigates to the success error sheet when the new password is confirmed', async () => {
    // mock redux store
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      getState: jest.fn().mockReturnValue({
        engine: {
          backgroundState: {
            SeedlessOnboardingController: {
              vault: 'vault string',
            },
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

    const component = await renderConfirmPasswordView();

    const newPasswordInput = component.getByTestId(
      ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
    );

    await act(async () => {
      fireEvent.changeText(newPasswordInput, 'NewPassword123');
    });

    const confirmPasswordInput = component.getByTestId(
      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
    );

    await act(async () => {
      fireEvent.changeText(confirmPasswordInput, 'NewPassword123');
    });

    const submitButton = component.getByTestId(
      ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
    );

    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        expect.objectContaining({
          screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
          params: expect.objectContaining({
            title: strings('reset_password.warning_password_change_title'),
            description: (
              <Text color={TextColor.Default} variant={TextVariant.BodyMD}>
                {strings('reset_password.warning_password_change_description')}{' '}
                <Text
                  color={TextColor.Primary}
                  onPress={expect.any(Function)}
                  variant={TextVariant.BodyMD}
                >
                  {`${strings('reset_password.learn_more')}`}
                </Text>
              </Text>
            ),
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

    // Get the onPrimaryButtonPress function from the navigation call
    const navigationCall = (NavigationService.navigation.navigate as jest.Mock)
      .mock.calls[0];
    const onPrimaryButtonPress = navigationCall[1].params.onPrimaryButtonPress;

    // Call the onPrimaryButtonPress function
    await act(async () => {
      onPrimaryButtonPress();
    });
  });

  it('open webview on learnMore click for seedless onboarding login flow', async () => {
    const component = await renderConfirmPasswordView();

    // The "Learn More" link should be visible immediately in the reset password view
    const learnMoreLink = component.getByTestId(
      ChoosePasswordSelectorsIDs.LEARN_MORE_LINK_ID,
    );

    expect(learnMoreLink).toBeOnTheScreen();

    // Click the "Learn More" link
    await act(async () => {
      fireEvent.press(learnMoreLink);
    });

    // Verify that the learnMore function was called with correct parameters
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://support.metamask.io/configure/wallet/passwords-and-metamask/',
        title: 'support.metamask.io',
      },
    });
  });

  it('open webview on learnMore click', async () => {
    const component = await renderConfirmPasswordView(false);

    // The "Learn More" link should be visible immediately in the reset password view
    const learnMoreLink = component.getByTestId(
      ChoosePasswordSelectorsIDs.LEARN_MORE_LINK_ID,
    );

    expect(learnMoreLink).toBeOnTheScreen();

    // Click the "Learn More" link
    await act(async () => {
      fireEvent.press(learnMoreLink);
    });

    // Verify that the learnMore function was called with correct parameters
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://support.metamask.io/managing-my-wallet/resetting-deleting-and-restoring/how-can-i-reset-my-password/',
        title: 'support.metamask.io',
      },
    });
  });

  it('password length is less than 8 characters, it shows an error', async () => {
    const component = await renderConfirmPasswordView();

    const newPasswordInput = component.getByTestId(
      ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
    );

    await act(async () => {
      fireEvent.changeText(newPasswordInput, '1234567');
    });

    expect(
      component.getByText(
        strings('reset_password.must_be_at_least', {
          number: 8,
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('password does not match, it shows an error', async () => {
    const component = await renderConfirmPasswordView();

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

  it('set biometryType and biometryChoice when currentAuthType is PASSCODE', async () => {
    // Mock Authentication.getType to return PASSCODE
    const mockGetType = jest.spyOn(Authentication, 'getType');
    mockGetType.mockResolvedValueOnce({
      currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
      availableBiometryType: undefined,
    });

    // Mock StorageWrapper.getItem for all keys called during componentDidMount
    const mockStorageWrapper = jest.mocked(StorageWrapper);
    mockStorageWrapper.getItem.mockImplementation((key) => {
      if (key === '@MetaMask:passcodeDisabled') {
        return Promise.resolve('TRUE');
      }
      if (key === '@MetaMask:biometryChoiceDisabled') {
        return Promise.resolve(null);
      }
      if (key === '@MetaMask:UserTermsAcceptedv1.0') {
        return Promise.resolve('true');
      }
      return Promise.resolve(null);
    });

    const component = await renderConfirmPasswordView();

    // Wait for componentDidMount to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Verify that getType was called
    expect(mockGetType).toHaveBeenCalled();

    // Verify that StorageWrapper.getItem was called with correct parameters
    expect(mockStorageWrapper.getItem).toHaveBeenCalledWith(
      '@MetaMask:biometryChoiceDisabled',
    );
    expect(mockStorageWrapper.getItem).toHaveBeenCalledWith(
      '@MetaMask:passcodeDisabled',
    );

    // Component should render without errors
    expect(component).toBeTruthy();
  });

  it('set biometryType and biometryChoice when availableBiometryType exists', async () => {
    // Mock Authentication.getType to return availableBiometryType
    const mockGetType = jest.spyOn(Authentication, 'getType');
    mockGetType.mockResolvedValueOnce({
      currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
      availableBiometryType: BIOMETRY_TYPE.FACE_ID,
    });

    // Mock StorageWrapper.getItem for all keys called during componentDidMount
    const mockStorageWrapper = jest.mocked(StorageWrapper);
    mockStorageWrapper.getItem.mockImplementation((key) => {
      if (key === '@MetaMask:biometryChoiceDisabled') {
        return Promise.resolve('TRUE');
      }
      if (key === '@MetaMask:passcodeDisabled') {
        return Promise.resolve(null);
      }
      if (key === '@MetaMask:UserTermsAcceptedv1.0') {
        return Promise.resolve('true');
      }
      return Promise.resolve(null);
    });

    const component = await renderConfirmPasswordView();

    // Wait for componentDidMount to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Verify that getType was called
    expect(mockGetType).toHaveBeenCalled();

    // Component should render without errors
    expect(component).toBeTruthy();

    // Verify that StorageWrapper.getItem was called with all expected keys
    expect(mockStorageWrapper.getItem).toHaveBeenCalledWith(
      '@MetaMask:biometryChoiceDisabled',
    );
    expect(mockStorageWrapper.getItem).toHaveBeenCalledWith(
      '@MetaMask:passcodeDisabled',
    );
  });

  it('biometric authentication flow when biometry is available and enabled', async () => {
    // Mock Authentication.getType to return availableBiometryType
    const mockGetType = jest.spyOn(Authentication, 'getType');
    mockGetType.mockResolvedValueOnce({
      currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
      availableBiometryType: BIOMETRY_TYPE.FACE_ID,
    });

    // Mock Authentication.getPassword to return credentials
    const mockGetPassword = jest.spyOn(Authentication, 'getPassword');
    mockGetPassword.mockResolvedValueOnce({
      username: 'testUser',
      password: 'testPassword123',
      service: 'testService',
      storage: STORAGE_TYPE.AES_GCM,
    });

    // Mock StorageWrapper.getItem to return biometry choice
    const mockStorageWrapper = jest.mocked(StorageWrapper);
    mockStorageWrapper.getItem.mockImplementation((key) => {
      if (key === '@MetaMask:biometryChoice') {
        return Promise.resolve('TRUE');
      }
      if (key === '@MetaMask:biometryChoiceDisabled') {
        return Promise.resolve(null);
      }
      if (key === '@MetaMask:passcodeDisabled') {
        return Promise.resolve(null);
      }
      if (key === '@MetaMask:UserTermsAcceptedv1.0') {
        return Promise.resolve('true');
      }
      return Promise.resolve(null);
    });
    const component = renderWithProviders(<ResetPassword {...defaultProps} />);

    // Wait for componentDidMount to complete and all async operations to finish
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
    });

    // Verify that StorageWrapper.getItem was called with all expected keys
    expect(mockStorageWrapper.getItem).toHaveBeenCalledWith(
      '@MetaMask:biometryChoiceDisabled',
    );
    expect(mockStorageWrapper.getItem).toHaveBeenCalledWith(
      '@MetaMask:passcodeDisabled',
    );

    // Component should render without errors
    expect(component).toBeTruthy();
  });

  it('on updating new password, confirm password is not cleared', async () => {
    const component = await renderConfirmPasswordView();

    const newPasswordInput = component.getByTestId(
      ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
    );

    await act(async () => {
      fireEvent.changeText(newPasswordInput, 'NewPassword123');
    });

    const confirmPasswordInput = component.getByTestId(
      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
    );

    await act(async () => {
      fireEvent.changeText(confirmPasswordInput, 'NewPassword123');
    });

    await act(async () => {
      fireEvent.changeText(newPasswordInput, 'NewPassword');
    });

    expect(newPasswordInput.props.value).toBe('NewPassword');

    expect(confirmPasswordInput.props.value).toBe('NewPassword123');
  });

  it('on clicking show password icon, the password is shown', async () => {
    const component = await renderConfirmPasswordView();

    const newPasswordInput = component.getByTestId(
      ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
    );

    await act(async () => {
      fireEvent.changeText(newPasswordInput, 'NewPassword123');
    });

    expect(newPasswordInput.props.secureTextEntry).toBe(true);

    const newPasswordShowIcon = component.getByTestId(
      ChoosePasswordSelectorsIDs.NEW_PASSWORD_SHOW_ICON_ID,
    );

    fireEvent.press(newPasswordShowIcon);

    await waitFor(() => {
      expect(newPasswordInput.props.secureTextEntry).toBe(false);
    });

    const confirmPasswordInput = component.getByTestId(
      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
    );

    await act(async () => {
      fireEvent.changeText(confirmPasswordInput, 'NewPassword123');
    });

    expect(confirmPasswordInput.props.secureTextEntry).toBe(true);

    const confirmPasswordShowIcon = component.getByTestId(
      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_SHOW_ICON_ID,
    );

    fireEvent.press(confirmPasswordShowIcon);

    await waitFor(() => {
      expect(confirmPasswordInput.props.secureTextEntry).toBe(false);
    });
  });

  describe('reset password error handling', () => {
    const mockRecreateVaultsWithNewPassword = jest.mocked(
      recreateVaultsWithNewPassword,
    );

    it('show error password is outdated', async () => {
      mockRecreateVaultsWithNewPassword.mockClear();
      mockRecreateVaultsWithNewPassword.mockRejectedValueOnce(
        new Error(SeedlessOnboardingControllerErrorMessage.OutdatedPassword),
      );

      jest
        .spyOn(Authentication, 'checkIsSeedlessPasswordOutdated')
        .mockResolvedValueOnce(false);

      NavigationService.navigation =
        mockNavigation as unknown as NavigationContainerRef<RootParamList>;

      const component = await renderConfirmPasswordView();

      const currentPasswordInput = component.getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      const confirmPasswordInput = component.getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );

      await act(async () => {
        fireEvent.changeText(currentPasswordInput, 'NewPassword123');
      });

      await act(async () => {
        fireEvent.changeText(confirmPasswordInput, 'NewPassword123');
      });

      const submitButton = component.getByTestId(
        ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
      );

      await act(async () => {
        fireEvent.press(submitButton);
      });

      const confirmButton =
        mockNavigation.navigate.mock.calls[0][1].params.onPrimaryButtonPress;
      await confirmButton();

      expect(mockRecreateVaultsWithNewPassword).toHaveBeenCalled();
      expect(mockNavigation.navigate.mock.calls[1][1].params.title).toBe(
        strings('login.seedless_password_outdated_modal_title'),
      );
    });

    it('show error change password failed', async () => {
      mockRecreateVaultsWithNewPassword.mockClear();
      mockRecreateVaultsWithNewPassword.mockRejectedValueOnce(
        new Error(
          SeedlessOnboardingControllerErrorMessage.FailedToChangePassword,
        ),
      );

      jest
        .spyOn(Authentication, 'checkIsSeedlessPasswordOutdated')
        .mockResolvedValueOnce(false);

      NavigationService.navigation =
        mockNavigation as unknown as NavigationContainerRef<RootParamList>;

      const component = await renderConfirmPasswordView();

      const currentPasswordInput = component.getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      const confirmPasswordInput = component.getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );

      await act(async () => {
        fireEvent.changeText(currentPasswordInput, 'NewPassword123');
      });

      await act(async () => {
        fireEvent.changeText(confirmPasswordInput, 'NewPassword123');
      });

      const submitButton = component.getByTestId(
        ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
      );

      await act(async () => {
        fireEvent.press(submitButton);
      });

      const confirmButton =
        mockNavigation.navigate.mock.calls[0][1].params.onPrimaryButtonPress;
      await confirmButton();

      expect(mockRecreateVaultsWithNewPassword).toHaveBeenCalled();

      expect(mockNavigation.navigate.mock.calls[1][1].params.title).toBe(
        strings('reset_password.seedless_change_password_error_modal_title'),
      );
    });
  });

  // Handle Error for SeedlessOnboarding Controller
  describe('handle error for SeedlessOnboarding Controller Error', () => {
    it('handle error for SeedlessOnboarding Controller Outdated Password', async () => {
      // Mock recreateVaultsWithNewPassword to throw an outdated password error
      const mockRecreateVaultsWithNewPassword = jest.mocked(
        recreateVaultsWithNewPassword,
      );
      mockRecreateVaultsWithNewPassword.mockClear();
      mockRecreateVaultsWithNewPassword.mockRejectedValueOnce(
        new Error(SeedlessOnboardingControllerErrorMessage.OutdatedPassword),
      );

      jest
        .spyOn(Authentication, 'checkIsSeedlessPasswordOutdated')
        .mockResolvedValueOnce(false);

      NavigationService.navigation =
        mockNavigation as unknown as NavigationContainerRef<RootParamList>;

      const spyLockApp = jest
        .spyOn(Authentication, 'lockApp')
        .mockResolvedValue(undefined);
      const component = await renderConfirmPasswordView();

      const currentPasswordInput = component.getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      const confirmPasswordInput = component.getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );

      await act(async () => {
        fireEvent.changeText(currentPasswordInput, 'NewPassword123');
      });

      await act(async () => {
        fireEvent.changeText(confirmPasswordInput, 'NewPassword123');
      });

      const submitButton = component.getByTestId(
        ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
      );

      await act(async () => {
        fireEvent.press(submitButton);
      });

      // First expect the warning modal to be shown
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        expect.objectContaining({
          screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
          params: expect.objectContaining({
            title: strings('reset_password.warning_password_change_title'),
            onPrimaryButtonPress: expect.any(Function),
          }),
        }),
      );

      // Get the onPrimaryButtonPress function from the warning modal and call it
      const warningCall = mockNavigation.navigate.mock.calls[0];
      const onPrimaryButtonPress = warningCall[1].params.onPrimaryButtonPress;

      await act(async () => {
        await onPrimaryButtonPress();
      });

      // Now expect the error modal for outdated password to be shown
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

      const ErrorSheetCall = mockNavigation.navigate.mock.calls[1];
      const onErrorSheetPrimaryButtonPress =
        ErrorSheetCall[1].params.onPrimaryButtonPress;
      await act(async () => {
        await onErrorSheetPrimaryButtonPress();
      });
      expect(spyLockApp).toHaveBeenCalled();
    });

    it('handle error for SeedlessOnboarding Controller Invalid Token', async () => {
      // Mock recreateVaultsWithNewPassword to throw an invalid token error
      const mockRecreateVaultsWithNewPassword = jest.mocked(
        recreateVaultsWithNewPassword,
      );
      mockRecreateVaultsWithNewPassword.mockClear();
      mockRecreateVaultsWithNewPassword.mockRejectedValueOnce(
        new Error(SeedlessOnboardingControllerErrorMessage.InvalidAccessToken),
      );

      jest
        .spyOn(Authentication, 'checkIsSeedlessPasswordOutdated')
        .mockResolvedValueOnce(false);

      NavigationService.navigation =
        mockNavigation as unknown as NavigationContainerRef<RootParamList>;

      const component = await renderConfirmPasswordView();

      const currentPasswordInput = component.getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      const confirmPasswordInput = component.getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );

      await act(async () => {
        fireEvent.changeText(currentPasswordInput, 'NewPassword123');
      });

      await act(async () => {
        fireEvent.changeText(confirmPasswordInput, 'NewPassword123');
      });

      const submitButton = component.getByTestId(
        ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
      );

      // Simulate pressing the submit button to trigger the invalid token error
      await act(async () => {
        fireEvent.press(submitButton);
      });

      // First expect the warning modal to be shown
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        expect.objectContaining({
          screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
          params: expect.objectContaining({
            title: strings('reset_password.warning_password_change_title'),
            onPrimaryButtonPress: expect.any(Function),
          }),
        }),
      );

      // Get the onPrimaryButtonPress function from the warning modal and call it
      const warningCall = mockNavigation.navigate.mock.calls[0];
      const onPrimaryButtonPress = warningCall[1].params.onPrimaryButtonPress;

      await act(async () => {
        await onPrimaryButtonPress();
      });

      // Now expect the error modal for invalid token to be shown
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

      const ErrorSheetCall = mockNavigation.navigate.mock.calls[1];
      const onErrorSheetPrimaryButtonPress =
        ErrorSheetCall[1].params.onPrimaryButtonPress;
      await act(async () => {
        await onErrorSheetPrimaryButtonPress();
      });
      expect(mockNavigation.replace).toHaveBeenCalledWith(
        Routes.SETTINGS.SECURITY_SETTINGS,
      );
    });
  });

  describe('biometry choice storage', () => {
    it('saves biometry choice as false when auth type is not biometric', async () => {
      mockUpdateAuthTypeStorageFlags.mockClear();

      const component = await renderConfirmPasswordView();

      const newPasswordInput = component.getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );

      await act(async () => {
        fireEvent.changeText(newPasswordInput, 'NewPassword123');
      });

      const confirmPasswordInput = component.getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );

      await act(async () => {
        fireEvent.changeText(confirmPasswordInput, 'NewPassword123');
      });

      const submitButton = component.getByTestId(
        ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
      );

      await act(async () => {
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
          Routes.MODAL.ROOT_MODAL_FLOW,
          expect.objectContaining({
            screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
          }),
        );
      });

      const navigationCall = (
        NavigationService.navigation.navigate as jest.Mock
      ).mock.calls[0];
      const onPrimaryButtonPress =
        navigationCall[1].params.onPrimaryButtonPress;

      await act(async () => {
        await onPrimaryButtonPress();
      });

      await waitFor(() => {
        expect(mockUpdateAuthTypeStorageFlags).toHaveBeenCalledWith(false);
      });
    });

    it('saves biometry choice when auth type is biometric', async () => {
      mockUpdateAuthTypeStorageFlags.mockClear();

      const mockAuthModule = jest.requireMock('../../../core/Authentication');
      const originalAuthData = mockAuthModule.authData;
      mockAuthModule.authData = {
        currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
      };

      const component = await renderConfirmPasswordView();

      const newPasswordInput = component.getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );

      await act(async () => {
        fireEvent.changeText(newPasswordInput, 'NewPassword123');
      });

      const confirmPasswordInput = component.getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );

      await act(async () => {
        fireEvent.changeText(confirmPasswordInput, 'NewPassword123');
      });

      const submitButton = component.getByTestId(
        ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
      );

      await act(async () => {
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
          Routes.MODAL.ROOT_MODAL_FLOW,
          expect.objectContaining({
            screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
          }),
        );
      });

      const navigationCall = (
        NavigationService.navigation.navigate as jest.Mock
      ).mock.calls[0];
      const onPrimaryButtonPress =
        navigationCall[1].params.onPrimaryButtonPress;

      await act(async () => {
        await onPrimaryButtonPress();
      });

      await waitFor(() => {
        expect(mockUpdateAuthTypeStorageFlags).toHaveBeenCalled();
      });

      mockAuthModule.authData = originalAuthData;
    });
  });
});

import React from 'react';
import { render, act, fireEvent, waitFor } from '@testing-library/react-native';
import configureMockStore from 'redux-mock-store';
import {
  ONBOARDING,
  PREVIOUS_SCREEN,
  PROTECT,
} from '../../../constants/navigation';
import Routes from '../../../constants/navigation/Routes';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { strings } from '../../../../locales/i18n';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { ChoosePasswordSelectorsIDs } from './ChoosePassword.testIds';
import { RESET_PASSWORD_GUIDE_URL } from '../../../constants/urls';
import Device from '../../../util/device';
import StorageWrapper from '../../../store/storage-wrapper';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { BIOMETRY_TYPE } from 'react-native-keychain';
import { Authentication } from '../../../core';
import { InteractionManager, Platform } from 'react-native';
import { EVENT_NAME } from '../../../core/Analytics';
import type { AnalyticsTrackingEvent } from '../../../util/analytics/AnalyticsEventBuilder';
import { passwordRequirementsMet } from '../../../util/password';

jest.mock('../../../util/password', () => ({
  ...jest.requireActual('../../../util/password'),
  passwordRequirementsMet: jest.fn(
    jest.requireActual('../../../util/password').passwordRequirementsMet,
  ),
}));

jest.mock('../../../util/metrics/TrackOnboarding/trackOnboarding');

jest.mock('../../../util/trace', () => ({
  ...jest.requireActual('../../../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

jest.mock('../../../util/mnemonic', () => ({
  uint8ArrayToMnemonic: jest.fn(
    (_uint8Array) =>
      'test test test test test test test test test test test junk',
  ),
}));

jest.mock('@metamask/key-tree', () => ({
  mnemonicPhraseToBytes: jest.fn((_phrase) => new Uint8Array([1, 2, 3])),
}));

import ChoosePassword from './index.tsx';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import {
  TraceName,
  TraceOperation,
  trace,
  endTrace,
} from '../../../util/trace';
import type { Span } from '@sentry/core';
import OAuthLoginService from '../../../core/OAuthService/OAuthService';
import { captureException } from '@sentry/react-native';

const mockTrackOnboarding = trackOnboarding as jest.MockedFunction<
  typeof trackOnboarding
>;

const mockCaptureException = captureException as jest.MockedFunction<
  typeof captureException
>;

OAuthLoginService.updateMarketingOptInStatus = jest
  .fn()
  .mockResolvedValue({ is_opt_in: true });

jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: {
      createNewVaultAndKeychain: jest.fn().mockResolvedValue(true),
      createNewVaultAndRestore: jest.fn().mockResolvedValue({
        getAccounts: jest.fn().mockResolvedValue(['0x123']),
      }),
      exportSeedPhrase: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
      getKeyringsByType: jest.fn().mockResolvedValue([
        {
          getAccounts: jest.fn().mockResolvedValue(['0x123']),
        },
      ]),
      importAccountWithStrategy: jest.fn().mockResolvedValue('0x123'),
    },
    PreferencesController: {
      setSelectedAddress: jest.fn(),
    },
    SelectedNetworkController: {
      setProviderType: jest.fn(),
    },
    AccountTrackerController: {
      refresh: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

jest.mock('./FoxRiveLoaderAnimation/FoxRiveLoaderAnimation');

jest.mock('../../../store/storage-wrapper', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('../../../core/Authentication', () => ({
  getType: jest.fn().mockResolvedValue({
    currentAuthType: 'passcode',
    availableBiometryType: 'faceID',
  }),
  componentAuthenticationType: jest.fn().mockResolvedValue({
    currentAuthType: 'passcode',
    availableBiometryType: 'faceID',
  }),
  requestBiometricsAccessControlForIOS: jest.fn((authType) =>
    Promise.resolve(authType),
  ),
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
  resetPassword: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../core/OAuthService/OAuthService');

jest.mock('../../../util/device', () => ({
  isIos: jest.fn(),
  isAndroid: jest.fn(),
  isMediumDevice: jest.fn(),
}));

const mockAuthenticateAsync = jest.fn().mockResolvedValue({ success: true });
jest.mock('expo-local-authentication', () => ({
  authenticateAsync: (...args: unknown[]) => mockAuthenticateAsync(...args),
}));

jest.mock('react-native/Libraries/Alert/Alert', () => {
  const alert = {
    alert: jest.fn(),
  };
  return { __esModule: true, default: alert, ...alert };
});

const mockMetricsIsEnabled = jest.fn().mockReturnValue(true);
const mockTrackEvent = jest.fn();
const mockEnable = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../core/Analytics/MetaMetrics', () => ({
  getInstance: () => ({
    isEnabled: mockMetricsIsEnabled,
    trackEvent: mockTrackEvent,
    enable: mockEnable,
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
    },
  },
  security: {
    allowLoginWithRememberMe: true,
  },
  onboarding: {
    events: [],
  },
};
const store = mockStore(initialState);

const mockNavigation = {
  setOptions: jest.fn(),
  goBack: jest.fn(),
  navigate: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
  setParams: jest.fn(),
  reset: jest.fn(),
};

const mockRoute: {
  params: {
    [key: string]: unknown;
  };
} = {
  params: {
    [PREVIOUS_SCREEN]: ONBOARDING,
  },
};

const mockMetrics = {
  isEnabled: mockMetricsIsEnabled,
  trackEvent: mockTrackEvent,
  enable: mockEnable,
  identify: jest.fn().mockResolvedValue(undefined),
  addTraitsToUser: jest.fn().mockResolvedValue(undefined),
  createEventBuilder: jest.fn(() => ({
    addProperties: jest.fn().mockReturnThis(),
    build: jest.fn(() => ({ name: 'Analytics Preference Selected' })),
  })),
  getMetaMetricsId: jest.fn(),
};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => mockNavigation,
    useRoute: () => mockRoute,
  };
});

jest.mock('../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => mockMetrics,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  withAnalyticsAwareness: (Component: any) => Component,
}));

const VALID_PASSWORD = 'Test123456!';

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <Provider store={store}>
      <ThemeContext.Provider value={mockTheme}>{ui}</ThemeContext.Provider>
    </Provider>,
  );

/** Waits for async work triggered by componentDidMount to settle. */
const waitForInit = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

/** Returns all primary form elements by testID in one call. */
const getFormElements = (
  component: ReturnType<typeof renderWithProviders>,
) => ({
  passwordInput: component.getByTestId(
    ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
  ),
  confirmPasswordInput: component.getByTestId(
    ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
  ),
  checkbox: component.getByTestId(
    ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
  ),
  submitButton: component.getByTestId(
    ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
  ),
});

/**
 * Fills the password form.
 * Pass `pressCheckbox = false` for OAuth flows where the checkbox is optional.
 */
const fillForm = async (
  component: ReturnType<typeof renderWithProviders>,
  password = VALID_PASSWORD,
  confirmPassword = password,
  pressCheckbox = true,
) => {
  const { passwordInput, confirmPasswordInput, checkbox } =
    getFormElements(component);
  await act(async () => {
    if (pressCheckbox) fireEvent.press(checkbox);
    fireEvent.changeText(passwordInput, password);
  });
  await act(async () => {
    fireEvent.changeText(confirmPasswordInput, confirmPassword);
  });
};

const fillAndSubmitForm = async (
  component: ReturnType<typeof renderWithProviders>,
  password = VALID_PASSWORD,
  confirmPassword = password,
  pressCheckbox = true,
) => {
  await fillForm(component, password, confirmPassword, pressCheckbox);
  // Get submit button directly to avoid triggering the duplicate-testID issue:
  // when the checkbox is checked, Checkbox spreads iconProps (including testID) onto
  // its inner Icon, so getByTestId would find two elements with the same ID.
  await act(async () => {
    fireEvent.press(
      component.getByTestId(ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID),
    );
  });
};

describe('ChoosePassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTrackOnboarding.mockClear();
    mockRoute.params = {
      [ONBOARDING]: true,
      [PROTECT]: true,
    };
  });

  it('renders correctly', async () => {
    const component = renderWithProviders(<ChoosePassword />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(component.toJSON()).toMatchSnapshot();
  });

  describe('UI State', () => {
    it('shows FoxRiveLoaderAnimation and hides form inputs during loading', async () => {
      const component = renderWithProviders(<ChoosePassword />);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      await fillAndSubmitForm(component);

      expect(
        component.getByTestId('fox-rive-loader-animation'),
      ).toBeOnTheScreen();
      expect(() =>
        component.getByTestId(ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID),
      ).toThrow();
    });

    it('toggles between form and loading state when wallet creation is in progress', async () => {
      const mockNewWalletAndKeychain = jest.spyOn(
        Authentication,
        'newWalletAndKeychain',
      );
      let resolveWalletCreation: () => void;
      const walletCreationPromise = new Promise<void>((resolve) => {
        resolveWalletCreation = resolve;
      });
      mockNewWalletAndKeychain.mockReturnValue(walletCreationPromise);

      const component = renderWithProviders(<ChoosePassword />);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Initially the form is visible and the loader is absent
      expect(
        component.getByTestId(ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID),
      ).toBeOnTheScreen();
      expect(() =>
        component.getByTestId('fox-rive-loader-animation'),
      ).toThrow();

      await fillAndSubmitForm(component);

      // After submit the loader is shown and the form is hidden
      expect(
        component.getByTestId('fox-rive-loader-animation'),
      ).toBeOnTheScreen();
      expect(() =>
        component.getByTestId(ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID),
      ).toThrow();

      await act(async () => {
        resolveWalletCreation();
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      mockNewWalletAndKeychain.mockRestore();
    });

    it('helper text is always visible below the password field', async () => {
      const component = renderWithProviders(<ChoosePassword />);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      const helperText = strings('choose_password.must_be_at_least', {
        number: 8,
      });

      expect(component.getByText(helperText)).toBeOnTheScreen();

      await act(async () => {
        fireEvent.changeText(
          component.getByTestId(
            ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
          ),
          'ValidPassword123',
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(component.getByText(helperText)).toBeOnTheScreen();
    });

    it('helper text remains visible after blurring the password field with a short password', async () => {
      const component = renderWithProviders(<ChoosePassword />);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      const { passwordInput } = getFormElements(component);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'short');
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      await act(async () => {
        fireEvent(passwordInput, 'blur');
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(
        component.getByText(
          strings('choose_password.must_be_at_least', { number: 8 }),
        ),
      ).toBeOnTheScreen();
    });

    it('helper text remains visible after refocusing the password field', async () => {
      const component = renderWithProviders(<ChoosePassword />);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      const { passwordInput } = getFormElements(component);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'short');
        fireEvent(passwordInput, 'blur');
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      await act(async () => {
        fireEvent(passwordInput, 'focus');
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(
        component.getByText(
          strings('choose_password.must_be_at_least', { number: 8 }),
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('Form Validation', () => {
    it('shows a password mismatch error when passwords differ', async () => {
      const component = renderWithProviders(<ChoosePassword />);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      await fillForm(component, 'Test123456!', 'DifferentPassword123!');

      expect(
        component.getByText(strings('choose_password.password_error')),
      ).toBeOnTheScreen();
    });

    it('submit button is disabled when passwords do not match', async () => {
      const component = renderWithProviders(<ChoosePassword />);
      await waitForInit();

      await fillForm(component, 'StrongPassword123', 'DifferentPassword123');

      // Avoid getFormElements here: the checkbox is checked after fillForm,
      // so querying its testID would find two elements (checkbox + inner Icon).
      const submitButton = component.getByTestId(
        ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
      );
      expect(submitButton).toBeDisabled();
      expect(Authentication.newWalletAndKeychain).not.toHaveBeenCalled();
    });

    it('confirm password field is cleared when the password field is fully cleared', async () => {
      mockRoute.params = { [ONBOARDING]: true };
      const component = renderWithProviders(<ChoosePassword />);
      await waitForInit();

      const { passwordInput, confirmPasswordInput } =
        getFormElements(component);

      await act(async () => {
        fireEvent.changeText(passwordInput, 'StrongPassword123!@#');
      });
      expect(
        component.getByDisplayValue('StrongPassword123!@#'),
      ).toBeOnTheScreen();

      await act(async () => {
        fireEvent.changeText(confirmPasswordInput, 'StrongPassword123!@#');
      });
      expect(
        component.getAllByDisplayValue('StrongPassword123!@#'),
      ).toHaveLength(2);

      // Partial edit to the password field does NOT clear the confirm field
      await act(async () => {
        fireEvent.changeText(passwordInput, 'StrongPassword123!@');
      });
      expect(
        component.getByDisplayValue('StrongPassword123!@#'),
      ).toBeOnTheScreen();

      // Fully clearing the password field also clears confirm password
      await act(async () => {
        fireEvent.changeText(passwordInput, '');
      });
      expect(component.queryByDisplayValue('StrongPassword123!@#')).toBeNull();
    });

    it('tracks WALLET_SETUP_FAILURE event when password is too short', async () => {
      // Mock passwordRequirementsMet to return false so the failure tracking
      // fires even with a valid-length password (required to keep the submit
      // button enabled while still triggering the validation branch).
      jest.mocked(passwordRequirementsMet).mockReturnValueOnce(false);

      const component = renderWithProviders(<ChoosePassword />);
      await waitForInit();

      await fillAndSubmitForm(component, 'Test1234');

      expect(Authentication.newWalletAndKeychain).not.toHaveBeenCalled();
      expect(mockTrackOnboarding).toHaveBeenCalled();

      const trackingEvent = mockTrackOnboarding.mock
        .calls[0][0] as AnalyticsTrackingEvent;
      expect(trackingEvent.name).toBe(EVENT_NAME.WALLET_SETUP_FAILURE);
      expect(trackingEvent.properties).toEqual({
        wallet_setup_type: 'import',
        error_type: strings('choose_password.password_length_error'),
      });
    });
  });

  describe('Navigation', () => {
    it('back button navigates to the previous screen', async () => {
      renderWithProviders(<ChoosePassword />);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockNavigation.setOptions).toHaveBeenCalledWith(
        expect.objectContaining({ headerLeft: expect.any(Function) }),
      );

      const headerLeftFn =
        mockNavigation.setOptions.mock.calls[0][0].headerLeft;
      await act(async () => {
        headerLeftFn().props.onPress();
      });

      expect(mockNavigation.goBack).toHaveBeenCalled();
    });

    it('navigates to ManualBackupStep1 with seed phrase after successful SRP wallet creation', async () => {
      const mockNewWalletAndKeychain = jest.spyOn(
        Authentication,
        'newWalletAndKeychain',
      );
      mockNewWalletAndKeychain.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 50)),
      );
      mockRoute.params = { ...mockRoute.params, [PREVIOUS_SCREEN]: ONBOARDING };

      const component = renderWithProviders(<ChoosePassword />);
      await waitForInit();
      mockNavigation.setParams.mockClear();

      await fillAndSubmitForm(component, 'StrongPassword123!@#');
      await waitForInit();

      await waitFor(() => {
        expect(mockNavigation.replace).toHaveBeenCalledWith(
          'ManualBackupStep1',
          {
            seedPhrase: expect.any(Array),
            backupFlow: false,
            settingsBackup: false,
          },
        );
      });

      mockNewWalletAndKeychain.mockRestore();
    });

    it('navigates to WalletCreationError screen when the device passcode is not set', async () => {
      jest.spyOn(Device, 'isIos').mockReturnValue(false);
      const passcodeError = new Error('Passcode not set.');
      const mockComponentAuthenticationType = jest.spyOn(
        Authentication,
        'componentAuthenticationType',
      );
      mockComponentAuthenticationType.mockRejectedValueOnce(passcodeError);

      const component = renderWithProviders(<ChoosePassword />);
      await waitForInit();

      await fillAndSubmitForm(component, 'StrongPassword123!');

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
      });

      expect(mockNavigation.reset).toHaveBeenCalledWith({
        routes: [
          {
            name: Routes.ONBOARDING.WALLET_CREATION_ERROR,
            params: expect.objectContaining({
              metricsEnabled: true,
              error: passcodeError,
            }),
          },
        ],
      });

      jest.spyOn(Device, 'isIos').mockRestore();
      mockComponentAuthenticationType.mockRestore();
    });

    it('navigates to OnboardingSuccess after OAuth wallet creation', async () => {
      (
        Authentication.componentAuthenticationType as jest.Mock
      ).mockResolvedValue({
        currentAuthType: 'biometrics',
        availableBiometryType: 'faceID',
      });
      const mockNewWalletAndKeychain = jest.spyOn(
        Authentication,
        'newWalletAndKeychain',
      );
      mockNewWalletAndKeychain.mockResolvedValue(undefined);
      jest
        .spyOn(OAuthLoginService, 'updateMarketingOptInStatus')
        .mockResolvedValue(undefined);

      mockRoute.params = {
        ...mockRoute.params,
        [PREVIOUS_SCREEN]: ONBOARDING,
        oauthLoginSuccess: true,
        provider: 'google',
      };

      const component = renderWithProviders(<ChoosePassword />);
      await fillAndSubmitForm(component);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
      });

      await waitFor(() => {
        expect(mockNavigation.reset).toHaveBeenCalledWith({
          index: 0,
          routes: [
            {
              name: 'OnboardingSuccess',
              params: { showPasswordHint: true },
            },
          ],
        });
        expect(mockTrackEvent).toHaveBeenCalled();
        expect(mockMetrics.addTraitsToUser).toHaveBeenCalled();
      });

      mockNewWalletAndKeychain.mockRestore();
    });

    it('navigates to the support article when the learn more link is pressed', async () => {
      mockRoute.params = {
        ...mockRoute.params,
        [PREVIOUS_SCREEN]: ONBOARDING,
        oauthLoginSuccess: false,
      };
      const component = renderWithProviders(<ChoosePassword />);

      const learnMoreLink = component.getByTestId(
        ChoosePasswordSelectorsIDs.LEARN_MORE_LINK_ID,
      );
      expect(learnMoreLink).toBeOnTheScreen();

      await act(async () => {
        fireEvent.press(learnMoreLink);
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: RESET_PASSWORD_GUIDE_URL,
          title: 'support.metamask.io',
        },
      });
    });
  });

  describe('Authentication Type Detection', () => {
    it('reads passcode storage flags when auth type is PASSCODE', async () => {
      const mockGetType = jest.spyOn(Authentication, 'getType');
      mockGetType.mockResolvedValueOnce({
        currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
        availableBiometryType: undefined,
      });
      const mockStorageWrapper = jest.mocked(StorageWrapper);
      mockStorageWrapper.getItem.mockImplementation((key) => {
        if (key === '@MetaMask:passcodeDisabled')
          return Promise.resolve('TRUE');
        if (key === '@MetaMask:biometryChoiceDisabled')
          return Promise.resolve(null);
        if (key === '@MetaMask:UserTermsAcceptedv1.0')
          return Promise.resolve('true');
        return Promise.resolve(null);
      });

      renderWithProviders(<ChoosePassword />);
      await waitForInit();

      expect(mockGetType).toHaveBeenCalled();
      expect(mockStorageWrapper.getItem).toHaveBeenCalledWith(
        '@MetaMask:biometryChoiceDisabled',
      );
      expect(mockStorageWrapper.getItem).toHaveBeenCalledWith(
        '@MetaMask:passcodeDisabled',
      );
    });

    it('reads biometry storage flags when face ID is available', async () => {
      const mockGetType = jest.spyOn(Authentication, 'getType');
      mockGetType.mockResolvedValueOnce({
        currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
        availableBiometryType: BIOMETRY_TYPE.FACE_ID,
      });
      const mockStorageWrapper = jest.mocked(StorageWrapper);
      mockStorageWrapper.getItem.mockImplementation((key) => {
        if (key === '@MetaMask:biometryChoiceDisabled')
          return Promise.resolve('TRUE');
        if (key === '@MetaMask:passcodeDisabled') return Promise.resolve(null);
        if (key === '@MetaMask:UserTermsAcceptedv1.0')
          return Promise.resolve('true');
        return Promise.resolve(null);
      });

      renderWithProviders(<ChoosePassword />);
      await waitForInit();

      expect(mockGetType).toHaveBeenCalled();
      expect(mockStorageWrapper.getItem).toHaveBeenCalledWith(
        '@MetaMask:biometryChoiceDisabled',
      );
      expect(mockStorageWrapper.getItem).toHaveBeenCalledWith(
        '@MetaMask:passcodeDisabled',
      );
    });

    it('uses PASSWORD auth type for wallet creation when biometrics are declined on iOS', async () => {
      const originalOS = Platform.OS;
      (Platform as { OS: string }).OS = 'ios';
      (
        Authentication.requestBiometricsAccessControlForIOS as jest.Mock
      ).mockResolvedValueOnce(AUTHENTICATION_TYPE.PASSWORD);
      mockRoute.params = { ...mockRoute.params, [PREVIOUS_SCREEN]: ONBOARDING };

      const mockNewWalletAndKeychain = jest.spyOn(
        Authentication,
        'newWalletAndKeychain',
      );
      mockNewWalletAndKeychain.mockImplementation(
        (_: string, authType: { currentAuthType: string }) => {
          expect(authType.currentAuthType).toBe(AUTHENTICATION_TYPE.PASSWORD);
          return Promise.resolve();
        },
      );

      const component = renderWithProviders(<ChoosePassword />);
      await waitForInit();

      await fillAndSubmitForm(component, 'StrongPassword123!@#');

      await waitFor(() => {
        expect(mockNewWalletAndKeychain).toHaveBeenCalled();
      });

      (Platform as { OS: string }).OS = originalOS;
      mockNewWalletAndKeychain.mockRestore();
    });

    it('uses BIOMETRIC auth type for wallet creation when biometrics succeed on iOS', async () => {
      const originalOS = Platform.OS;
      (Platform as { OS: string }).OS = 'ios';
      (
        Authentication.requestBiometricsAccessControlForIOS as jest.Mock
      ).mockResolvedValueOnce(AUTHENTICATION_TYPE.BIOMETRIC);
      mockRoute.params = { ...mockRoute.params, [PREVIOUS_SCREEN]: ONBOARDING };

      const mockComponentAuthenticationType = jest.spyOn(
        Authentication,
        'componentAuthenticationType',
      );
      mockComponentAuthenticationType.mockResolvedValueOnce({
        currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
        availableBiometryType: BIOMETRY_TYPE.FACE_ID,
      });

      const mockNewWalletAndKeychain = jest.spyOn(
        Authentication,
        'newWalletAndKeychain',
      );
      mockNewWalletAndKeychain.mockImplementation(
        (_: string, authType: { currentAuthType: string }) => {
          expect(authType.currentAuthType).toBe(AUTHENTICATION_TYPE.BIOMETRIC);
          return Promise.resolve();
        },
      );

      const component = renderWithProviders(<ChoosePassword />);
      await waitForInit();

      await fillAndSubmitForm(component, 'StrongPassword123!@#');

      await waitFor(() => {
        expect(mockNewWalletAndKeychain).toHaveBeenCalled();
      });

      (Platform as { OS: string }).OS = originalOS;
      mockNewWalletAndKeychain.mockRestore();
      mockComponentAuthenticationType.mockRestore();
      (
        Authentication.componentAuthenticationType as jest.Mock
      ).mockResolvedValue({
        currentAuthType: 'passcode',
        availableBiometryType: 'faceID',
      });
    });
  });

  describe('OAuth Submit Button Behaviour', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('submit button is enabled for OAuth users without checking the checkbox', async () => {
      mockRoute.params = {
        ...mockRoute.params,
        [PREVIOUS_SCREEN]: ONBOARDING,
        oauthLoginSuccess: true,
      };
      const component = renderWithProviders(<ChoosePassword />);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // OAuth users do not need the checkbox to enable submission
      await fillForm(component, 'Test1234', 'Test1234', false);

      const { submitButton } = getFormElements(component);
      expect(submitButton).not.toBeDisabled();
    });

    it('submit button requires the checkbox for non-OAuth users', async () => {
      mockRoute.params = {
        ...mockRoute.params,
        [PREVIOUS_SCREEN]: ONBOARDING,
        oauthLoginSuccess: false,
      };
      const component = renderWithProviders(<ChoosePassword />);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Passwords match and are long enough but checkbox is not checked
      await fillForm(component, 'Test1234', 'Test1234', false);

      const { submitButton } = getFormElements(component);
      expect(submitButton).toBeDisabled();
    });

    it('submit button requires the checkbox when oauthLoginSuccess is undefined', async () => {
      mockRoute.params = {
        ...mockRoute.params,
        [PREVIOUS_SCREEN]: ONBOARDING,
      };
      const component = renderWithProviders(<ChoosePassword />);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      await fillForm(component, 'Test1234', 'Test1234', false);

      const { submitButton } = getFormElements(component);
      expect(submitButton).toBeDisabled();
    });
  });

  describe('OAuth Login Description Text', () => {
    it('shows iOS-specific description when on iOS with OAuth login', async () => {
      const originalPlatform = Platform.OS;
      Object.defineProperty(Platform, 'OS', { writable: true, value: 'ios' });
      mockRoute.params = {
        ...mockRoute.params,
        [PREVIOUS_SCREEN]: ONBOARDING,
        oauthLoginSuccess: true,
      };

      const component = renderWithProviders(<ChoosePassword />);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(() =>
        component.getByText(/Use this for wallet recovery/),
      ).not.toThrow();

      Object.defineProperty(Platform, 'OS', {
        writable: true,
        value: originalPlatform,
      });
    });

    it('shows Android description when on Android with OAuth login', async () => {
      const originalPlatform = Platform.OS;
      Object.defineProperty(Platform, 'OS', {
        writable: true,
        value: 'android',
      });
      mockRoute.params = {
        ...mockRoute.params,
        [PREVIOUS_SCREEN]: ONBOARDING,
        oauthLoginSuccess: true,
      };

      const component = renderWithProviders(<ChoosePassword />);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(() =>
        component.getByText(/If you lose this password/),
      ).not.toThrow();

      Object.defineProperty(Platform, 'OS', {
        writable: true,
        value: originalPlatform,
      });
    });
  });

  describe('Marketing API', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('sends marketing opt-in=true when OAuth user checks the checkbox before submitting', async () => {
      (
        Authentication.componentAuthenticationType as jest.Mock
      ).mockResolvedValue({
        currentAuthType: 'passcode',
        availableBiometryType: 'faceID',
      });
      const mockNewWalletAndKeychain = jest.spyOn(
        Authentication,
        'newWalletAndKeychain',
      );
      mockNewWalletAndKeychain.mockResolvedValue(undefined);
      mockRoute.params = {
        ...mockRoute.params,
        [PREVIOUS_SCREEN]: ONBOARDING,
        oauthLoginSuccess: true,
        provider: 'google',
      };
      const spyUpdateMarketingOptInStatus = jest
        .spyOn(OAuthLoginService, 'updateMarketingOptInStatus')
        .mockResolvedValue(undefined);

      const component = renderWithProviders(<ChoosePassword />);
      await waitForInit();
      // Press the marketing opt-in checkbox then submit
      await fillAndSubmitForm(component);

      await waitFor(() => {
        expect(mockNewWalletAndKeychain).toHaveBeenCalledTimes(1);
        expect(spyUpdateMarketingOptInStatus).toHaveBeenCalledWith(true);
        expect(mockTrackEvent).toHaveBeenCalled();
        expect(mockMetrics.addTraitsToUser).toHaveBeenCalled();
      });

      mockNewWalletAndKeychain.mockRestore();
    });

    it('sends marketing opt-in=false when OAuth user does not check the checkbox', async () => {
      (
        Authentication.componentAuthenticationType as jest.Mock
      ).mockResolvedValue({
        currentAuthType: 'passcode',
        availableBiometryType: 'faceID',
      });
      const mockNewWalletAndKeychain = jest.spyOn(
        Authentication,
        'newWalletAndKeychain',
      );
      mockNewWalletAndKeychain.mockResolvedValue(undefined);
      mockRoute.params = {
        ...mockRoute.params,
        [PREVIOUS_SCREEN]: ONBOARDING,
        oauthLoginSuccess: true,
        provider: 'apple',
      };
      const spyUpdateMarketingOptInStatus = jest
        .spyOn(OAuthLoginService, 'updateMarketingOptInStatus')
        .mockResolvedValue(undefined);

      // Do NOT press the checkbox so isSelected = false → opt-in = false
      const component = renderWithProviders(<ChoosePassword />);
      await waitForInit();
      await fillAndSubmitForm(component, VALID_PASSWORD, VALID_PASSWORD, false);

      await waitFor(() => {
        expect(mockNewWalletAndKeychain).toHaveBeenCalledTimes(1);
        expect(spyUpdateMarketingOptInStatus).toHaveBeenCalledWith(false);
        expect(mockTrackEvent).toHaveBeenCalled();
        expect(mockMetrics.addTraitsToUser).toHaveBeenCalled();
      });

      mockNewWalletAndKeychain.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('reports OAuth server error to Sentry without navigating to the error screen', async () => {
      (
        Authentication.componentAuthenticationType as jest.Mock
      ).mockResolvedValue({
        currentAuthType: 'biometrics',
        availableBiometryType: 'faceID',
      });
      mockMetricsIsEnabled.mockReturnValue(true);

      const mockNewWalletAndKeychain = jest.spyOn(
        Authentication,
        'newWalletAndKeychain',
      );
      mockNewWalletAndKeychain
        .mockRejectedValueOnce(
          new Error('SeedlessOnboardingController - Auth server is down'),
        )
        .mockResolvedValueOnce(undefined);
      mockRoute.params = {
        ...mockRoute.params,
        [PREVIOUS_SCREEN]: ONBOARDING,
        oauthLoginSuccess: true,
      };

      const component = renderWithProviders(<ChoosePassword />);
      await waitForInit();

      await fillAndSubmitForm(component, 'StrongPassword123!');

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
      });

      expect(mockNewWalletAndKeychain).toHaveBeenCalledTimes(1);
      expect(mockCaptureException).toHaveBeenCalled();
      expect(mockTrackEvent).not.toHaveBeenLastCalledWith(
        expect.objectContaining({ name: 'Error Screen Viewed' }),
      );

      mockNewWalletAndKeychain.mockRestore();
    });

    it('reports social login error to Sentry and navigates to WalletCreationError', async () => {
      mockMetricsIsEnabled.mockReturnValue(true);
      const walletError = new Error('Social login wallet creation failed');
      const mockComponentAuthenticationType = jest.spyOn(
        Authentication,
        'componentAuthenticationType',
      );
      mockComponentAuthenticationType.mockRejectedValueOnce(walletError);
      mockRoute.params = {
        ...mockRoute.params,
        [PREVIOUS_SCREEN]: ONBOARDING,
        oauthLoginSuccess: true,
      };

      const component = renderWithProviders(<ChoosePassword />);
      await waitForInit();

      await fillAndSubmitForm(component, 'StrongPassword123!');

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
      });

      expect(mockCaptureException).toHaveBeenCalledWith(walletError, {
        tags: {
          view: 'ChoosePassword',
          context: 'Wallet creation failed - auto reported',
        },
      });
      expect(mockNavigation.reset).toHaveBeenCalledWith({
        routes: [
          {
            name: Routes.ONBOARDING.WALLET_CREATION_ERROR,
            params: expect.objectContaining({
              metricsEnabled: true,
              error: walletError,
            }),
          },
        ],
      });

      mockComponentAuthenticationType.mockReset();
      mockComponentAuthenticationType.mockResolvedValue({
        currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
        availableBiometryType: BIOMETRY_TYPE.FACE_ID,
      });
    });

    it('reports SRP wallet creation error to Sentry and navigates to WalletCreationError', async () => {
      mockMetricsIsEnabled.mockReturnValue(true);
      const walletError = new Error('SRP wallet creation failed');
      const mockComponentAuthenticationType = jest.spyOn(
        Authentication,
        'componentAuthenticationType',
      );
      mockComponentAuthenticationType.mockRejectedValueOnce(walletError);
      mockRoute.params = {
        ...mockRoute.params,
        [PREVIOUS_SCREEN]: ONBOARDING,
        oauthLoginSuccess: false,
      };

      const component = renderWithProviders(<ChoosePassword />);
      await waitForInit();

      await fillAndSubmitForm(component, 'StrongPassword123!');

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
      });

      expect(mockCaptureException).toHaveBeenCalledWith(walletError, {
        tags: {
          view: 'ChoosePassword',
          context: 'Wallet creation failed - auto reported',
        },
      });
      expect(mockNavigation.reset).toHaveBeenCalledWith({
        routes: [
          {
            name: Routes.ONBOARDING.WALLET_CREATION_ERROR,
            params: expect.objectContaining({
              metricsEnabled: true,
              error: walletError,
            }),
          },
        ],
      });

      mockComponentAuthenticationType.mockReset();
      mockComponentAuthenticationType.mockResolvedValue({
        currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
        availableBiometryType: BIOMETRY_TYPE.FACE_ID,
      });
    });
  });

  describe('Tracing', () => {
    const mockTrace = trace as jest.MockedFunction<typeof trace>;
    const mockEndTrace = endTrace as jest.MockedFunction<typeof endTrace>;

    beforeEach(() => {
      jest.clearAllMocks();
      mockTrace.mockClear();
      mockEndTrace.mockClear();
    });

    it('starts the attempt trace on mount and ends it on unmount', async () => {
      const mockOnboardingTraceCtx = {
        traceId: 'test-trace-id',
      } as unknown as Span;
      const mockTraceCtx = {
        traceId: 'setup-attempt-trace-id',
      } as unknown as Span;
      mockTrace.mockReturnValue(mockTraceCtx);
      mockRoute.params = {
        ...mockRoute.params,
        onboardingTraceCtx: mockOnboardingTraceCtx,
      };

      const { unmount } = renderWithProviders(<ChoosePassword />);
      await act(async () => Promise.resolve());

      expect(mockTrace).toHaveBeenCalledWith({
        name: TraceName.OnboardingPasswordSetupAttempt,
        op: TraceOperation.OnboardingUserJourney,
        parentContext: mockOnboardingTraceCtx,
      });

      unmount();

      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.OnboardingPasswordSetupAttempt,
      });
    });

    it('skips tracing entirely when no onboardingTraceCtx is provided', async () => {
      const { unmount } = renderWithProviders(<ChoosePassword />);
      await waitForInit();

      expect(mockTrace).not.toHaveBeenCalled();

      unmount();

      expect(mockEndTrace).not.toHaveBeenCalled();
    });

    it('emits an error trace when password creation fails', async () => {
      const mockOnboardingTraceCtx = {
        traceId: 'test-trace-id',
      } as unknown as Span;
      const testError = new Error('Password creation failed');
      mockTrace.mockReturnValue(undefined);

      const mockComponentAuthenticationType = jest.spyOn(
        Authentication,
        'componentAuthenticationType',
      );
      mockComponentAuthenticationType.mockRejectedValueOnce(testError);
      mockRoute.params = {
        ...mockRoute.params,
        [PREVIOUS_SCREEN]: ONBOARDING,
        onboardingTraceCtx: mockOnboardingTraceCtx,
      };

      const component = renderWithProviders(<ChoosePassword />);
      await act(async () => Promise.resolve());

      await fillAndSubmitForm(component, 'StrongPassword123!');

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
      });

      expect(mockTrace).toHaveBeenCalledWith({
        name: TraceName.OnboardingPasswordSetupError,
        op: TraceOperation.OnboardingUserJourney,
        parentContext: mockOnboardingTraceCtx,
        tags: { errorMessage: testError.toString() },
      });
      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.OnboardingPasswordSetupError,
      });
    });

    it('does not emit an error trace when no onboardingTraceCtx is provided', async () => {
      const testError = new Error('Password creation failed');
      const mockComponentAuthenticationType = jest.spyOn(
        Authentication,
        'componentAuthenticationType',
      );
      mockComponentAuthenticationType.mockRejectedValueOnce(testError);
      mockRoute.params = { ...mockRoute.params, [PREVIOUS_SCREEN]: ONBOARDING };

      const component = renderWithProviders(<ChoosePassword />);
      await waitForInit();

      await fillAndSubmitForm(component, 'StrongPassword123!');

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
      });

      expect(mockTrace).not.toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.OnboardingPasswordSetupError,
        }),
      );
      expect(mockEndTrace).not.toHaveBeenCalledWith({
        name: TraceName.OnboardingPasswordSetupError,
      });
    });

    it('does not emit an error trace when password creation succeeds', async () => {
      const mockOnboardingTraceCtx = {
        traceId: 'test-trace-id',
      } as unknown as Span;
      mockTrace.mockReturnValue(undefined);

      const mockComponentAuthenticationType = jest.spyOn(
        Authentication,
        'componentAuthenticationType',
      );
      mockComponentAuthenticationType.mockResolvedValueOnce({
        currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
        availableBiometryType: undefined,
      });
      const mockNewWalletAndKeychain = jest.spyOn(
        Authentication,
        'newWalletAndKeychain',
      );
      mockNewWalletAndKeychain.mockResolvedValueOnce(undefined);
      mockRoute.params = {
        ...mockRoute.params,
        [PREVIOUS_SCREEN]: ONBOARDING,
        onboardingTraceCtx: mockOnboardingTraceCtx,
      };

      const component = renderWithProviders(<ChoosePassword />);
      await waitForInit();

      await fillAndSubmitForm(component, 'StrongPassword123!');

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
      });

      expect(mockTrace).toHaveBeenCalledWith({
        name: TraceName.OnboardingPasswordSetupAttempt,
        op: TraceOperation.OnboardingUserJourney,
        parentContext: mockOnboardingTraceCtx,
      });
      expect(mockTrace).not.toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.OnboardingPasswordSetupError,
        }),
      );
      expect(mockEndTrace).not.toHaveBeenCalledWith({
        name: TraceName.OnboardingPasswordSetupError,
      });
    });
  });

  describe('account_type analytics', () => {
    it('uses metamask account_type when no provider is set', async () => {
      mockTrackOnboarding.mockClear();

      mockRoute.params = {
        ...mockRoute.params,
        [PREVIOUS_SCREEN]: ONBOARDING,
      };

      const component = renderWithProviders(<ChoosePassword />);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const passwordInput = component.getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      const confirmPasswordInput = component.getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );
      const checkbox = component.getByTestId(
        ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
      );

      await act(async () => {
        fireEvent.changeText(passwordInput, 'StrongPass123!');
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      await act(async () => {
        fireEvent.changeText(confirmPasswordInput, 'StrongPass123!');
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      await act(async () => {
        fireEvent.press(checkbox);
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const submitButton = component.getByTestId(
        ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
      );
      await act(async () => {
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(mockTrackOnboarding).toHaveBeenCalledWith(
          expect.objectContaining({
            properties: expect.objectContaining({
              account_type: 'metamask',
            }),
          }),
          expect.any(Function),
        );
      });
    });

    it('uses metamask_google account_type when provider is google', async () => {
      mockTrackOnboarding.mockClear();

      mockRoute.params = {
        ...mockRoute.params,
        [PREVIOUS_SCREEN]: ONBOARDING,
        provider: 'google',
        oauthLoginSuccess: true,
      };

      const component = renderWithProviders(<ChoosePassword />);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const passwordInput = component.getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      const confirmPasswordInput = component.getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );

      await act(async () => {
        fireEvent.changeText(passwordInput, 'StrongPass123!');
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      await act(async () => {
        fireEvent.changeText(confirmPasswordInput, 'StrongPass123!');
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const submitButton = component.getByTestId(
        ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
      );
      await act(async () => {
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(mockTrackOnboarding).toHaveBeenCalledWith(
          expect.objectContaining({
            properties: expect.objectContaining({
              account_type: 'metamask_google',
            }),
          }),
          expect.any(Function),
        );
      });
    });
  });
});

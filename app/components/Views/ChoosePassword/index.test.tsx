import React from 'react';
import { render, act, fireEvent, waitFor } from '@testing-library/react-native';
import configureMockStore from 'redux-mock-store';
import {
  ONBOARDING,
  PREVIOUS_SCREEN,
  PROTECT,
} from '../../../constants/navigation';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { strings } from '../../../../locales/i18n';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { ChoosePasswordSelectorsIDs } from './ChoosePassword.testIds';
import Device from '../../../util/device';
import StorageWrapper from '../../../store/storage-wrapper';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { BIOMETRY_TYPE } from 'react-native-keychain';
import { Authentication } from '../../../core';
import { InteractionManager, Alert, Platform } from 'react-native';
import { EVENT_NAME } from '../../../core/Analytics';

jest.mock('../../../util/metrics/TrackOnboarding/trackOnboarding');

// Mock the entire trace module
jest.mock('../../../util/trace', () => ({
  ...jest.requireActual('../../../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

// Mock mnemonic utility
jest.mock('../../../util/mnemonic', () => ({
  uint8ArrayToMnemonic: jest.fn(
    (_uint8Array) =>
      'test test test test test test test test test test test junk',
  ),
}));

// Mock key-tree utility
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

const mockTrackOnboarding = trackOnboarding as jest.MockedFunction<
  typeof trackOnboarding
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

jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

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
  addTraitsToUser: jest.fn(),
  createEventBuilder: jest.fn(() => ({
    addProperties: jest.fn().mockReturnThis(),
    build: jest.fn(),
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

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <Provider store={store}>
      <ThemeContext.Provider value={mockTheme}>{ui}</ThemeContext.Provider>
    </Provider>,
  );

describe('ChoosePassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTrackOnboarding.mockClear();
    mockRoute.params = {
      [ONBOARDING]: true,
      [PROTECT]: true,
    };
  });

  it('render matches snapshot', async () => {
    const component = renderWithProviders(<ChoosePassword />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(component.toJSON()).toMatchSnapshot();
  });

  it('render loading state while creating password', async () => {
    jest.spyOn(Device, 'isIos').mockReturnValue(true);
    jest.spyOn(Device, 'isMediumDevice').mockReturnValue(true);
    const spyUpdateMarketingOptInStatus = jest.spyOn(
      OAuthLoginService,
      'updateMarketingOptInStatus',
    );

    spyUpdateMarketingOptInStatus.mockResolvedValue(undefined);

    const component = renderWithProviders(<ChoosePassword />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const passwordInput = component.getByTestId(
      ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
    );

    await act(async () => {
      fireEvent.changeText(passwordInput, 'Test123456!');
    });

    const confirmPasswordInput = component.getByTestId(
      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
    );

    await act(async () => {
      fireEvent.changeText(confirmPasswordInput, 'Test123456!');
    });

    const checkbox = component.getByTestId(
      ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
    );

    await act(async () => {
      fireEvent.press(checkbox);
    });

    const submitButton = component.getByRole('button', {
      name: strings('choose_password.create_password_cta'),
    });

    // Button should still be disabled (checkbox not checked)
    expect(submitButton.props.disabled).toBe(false);

    await act(async () => {
      fireEvent.press(submitButton);
    });

    // Now using FoxRiveLoaderAnimation which shows "Setting up your wallet..."
    jest.spyOn(Device, 'isIos').mockRestore();
    jest.spyOn(Device, 'isMediumDevice').mockRestore();
  });

  it('renders FoxRiveLoaderAnimation component with correct props in loading state', async () => {
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
    const submitButton = component.getByRole('button', {
      name: strings('choose_password.create_password_cta'),
    });

    // Fill form and submit to trigger loading state
    await act(async () => {
      fireEvent.changeText(passwordInput, 'Test123456!');
      fireEvent.changeText(confirmPasswordInput, 'Test123456!');
      fireEvent.press(checkbox);
    });

    await act(async () => {
      fireEvent.press(submitButton);
    });

    // Verify FoxRiveLoaderAnimation component is rendered
    const animationComponent = component.getByTestId(
      'fox-rive-loader-animation',
    );
    expect(animationComponent).toBeTruthy();
  });

  it('applies loadingWrapper styles when in loading state', async () => {
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
    const submitButton = component.getByRole('button', {
      name: strings('choose_password.create_password_cta'),
    });

    // Fill form and submit to trigger loading state
    await act(async () => {
      fireEvent.changeText(passwordInput, 'Test123456!');
      fireEvent.changeText(confirmPasswordInput, 'Test123456!');
      fireEvent.press(checkbox);
    });

    await act(async () => {
      fireEvent.press(submitButton);
    });

    // Verify loading wrapper is present (contains the animation)
    const animationComponent = component.getByTestId(
      'fox-rive-loader-animation',
    );
    expect(animationComponent.parent).toBeTruthy();

    expect(() =>
      component.getByTestId(ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID),
    ).toThrow();
  });

  it('toggles between loading and normal state correctly', async () => {
    // Mock Authentication.newWalletAndKeychain to control loading state
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

    // Initially should show normal form
    expect(
      component.getByTestId(ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID),
    ).toBeTruthy();
    expect(() => component.getByTestId('fox-rive-loader-animation')).toThrow();

    const passwordInput = component.getByTestId(
      ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
    );
    const confirmPasswordInput = component.getByTestId(
      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
    );
    const checkbox = component.getByTestId(
      ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
    );
    const submitButton = component.getByRole('button', {
      name: strings('choose_password.create_password_cta'),
    });

    // Fill form and submit to trigger loading state
    await act(async () => {
      fireEvent.changeText(passwordInput, 'Test123456!');
      fireEvent.changeText(confirmPasswordInput, 'Test123456!');
      fireEvent.press(checkbox);
    });

    await act(async () => {
      fireEvent.press(submitButton);
    });

    expect(component.getByTestId('fox-rive-loader-animation')).toBeTruthy();
    expect(() =>
      component.getByTestId(ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID),
    ).toThrow();

    // Complete wallet creation to exit loading state
    await act(async () => {
      resolveWalletCreation();
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    mockNewWalletAndKeychain.mockRestore();
  });

  it('error message is shown when passwords do not match', async () => {
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
    const submitButton = component.getByTestId(
      ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
    );

    // Enter matching passwords
    await act(async () => {
      fireEvent.changeText(passwordInput, 'Test123456!');
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Enter non-matching passwords
    await act(async () => {
      fireEvent.changeText(confirmPasswordInput, 'DifferentPassword123!');
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Check the checkbox and wait for state update
    await act(async () => {
      fireEvent.press(checkbox);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    fireEvent.press(submitButton);

    // Error message should be shown
    const errorMessage = component.getByText(
      strings('choose_password.password_error'),
    );
    expect(errorMessage).toBeOnTheScreen();
  });

  it('helper text remains visible after password meets minimum length requirement', async () => {
    const component = renderWithProviders(<ChoosePassword />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const passwordInput = component.getByTestId(
      ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
    );

    // Verify helper text is visible initially (empty password)
    expect(
      component.getByText(
        strings('choose_password.must_be_at_least', { number: 8 }),
      ),
    ).toBeOnTheScreen();

    // Enter a valid password that meets minimum length
    await act(async () => {
      fireEvent.changeText(passwordInput, 'ValidPassword123');
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Helper text should persist even after password meets requirement
    expect(
      component.getByText(
        strings('choose_password.must_be_at_least', { number: 8 }),
      ),
    ).toBeOnTheScreen();
  });

  it('render header left button on press, navigates to previous screen', async () => {
    renderWithProviders(<ChoosePassword />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Verify that setOptions was called with correct parameters
    expect(mockNavigation.setOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        headerLeft: expect.any(Function),
      }),
    );

    // Get the headerLeft function that was passed to setOptions
    const headerLeftFn = mockNavigation.setOptions.mock.calls[0][0].headerLeft;

    // Get the TouchableOpacity component from headerLeft
    const headerLeftComponent = headerLeftFn();

    // Simulate pressing the back button by calling the onPress handler directly
    await act(async () => {
      headerLeftComponent.props.onPress();
    });

    expect(mockNavigation.goBack).toHaveBeenCalled();
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

    const component = renderWithProviders(<ChoosePassword />);

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

    const component = renderWithProviders(<ChoosePassword />);

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

  it('create a password and navigate to ManualBackupStep1', async () => {
    // Mock Authentication.newWalletAndKeychain to resolve quickly to trigger loading state
    const mockNewWalletAndKeychain = jest.spyOn(
      Authentication,
      'newWalletAndKeychain',
    );

    mockNewWalletAndKeychain.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 50)),
    );

    mockRoute.params = {
      ...mockRoute.params,
      [PREVIOUS_SCREEN]: ONBOARDING,
    };
    const component = renderWithProviders(<ChoosePassword />);

    // Wait for initial render and componentDidMount
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Clear previous navigation calls to focus on the componentDidUpdate behavior
    mockNavigation.setParams.mockClear();

    // Fill in form with valid data that meets all requirements
    const passwordInput = component.getByTestId(
      ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
    );

    await act(async () => {
      fireEvent.changeText(passwordInput, 'StrongPassword123!@#');
    });

    expect(passwordInput.props.value).toBe('StrongPassword123!@#');

    const confirmPasswordInput = component.getByTestId(
      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
    );

    await act(async () => {
      fireEvent.changeText(confirmPasswordInput, 'StrongPassword123!@#');
    });

    expect(confirmPasswordInput.props.value).toBe('StrongPassword123!@#');

    const checkbox = component.getByTestId(
      ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
    );

    await act(async () => {
      fireEvent.press(checkbox);
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    await waitFor(() => {
      expect(checkbox.props.disabled).toBe(false);
    });

    const submitButton = component.getByTestId(
      ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
    );

    // Submit the form to trigger loading state change
    await act(async () => {
      fireEvent.press(submitButton);
    });

    // Wait for loading state to be set and animation to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Wait for the animation callback to trigger navigation
    await waitFor(() => {
      expect(mockNavigation.replace).toHaveBeenCalledWith('ManualBackupStep1', {
        seedPhrase: expect.any(Array),
        backupFlow: false,
        settingsBackup: false,
      });
    });

    // // Clean up mock
    mockNewWalletAndKeychain.mockRestore();
  });

  it('confirm password input is cleared when password input is cleared', async () => {
    mockRoute.params = { [ONBOARDING]: true };

    const component = renderWithProviders(<ChoosePassword />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    const passwordInput = component.getByTestId(
      ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
    );

    await act(async () => {
      fireEvent.changeText(passwordInput, 'StrongPassword123!@#');
    });

    expect(passwordInput.props.value).toBe('StrongPassword123!@#');

    const confirmPasswordInput = component.getByTestId(
      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
    );

    await act(async () => {
      fireEvent.changeText(confirmPasswordInput, 'StrongPassword123!@#');
    });

    expect(confirmPasswordInput.props.value).toBe('StrongPassword123!@#');

    await act(async () => {
      fireEvent.changeText(passwordInput, 'StrongPassword123!@');
    });

    expect(confirmPasswordInput.props.value).toBe('StrongPassword123!@#');

    await act(async () => {
      fireEvent.changeText(passwordInput, '');
    });

    expect(confirmPasswordInput.props.value).toBe('');
  });

  it('should track failure when password requirements are not met', async () => {
    mockTrackOnboarding.mockClear();

    const component = renderWithProviders(<ChoosePassword />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
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

    const submitButton = component.getByTestId(
      ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
    );
    // Use short password that will fail passwordRequirementsMet
    await act(async () => {
      fireEvent.press(checkbox);
      fireEvent.changeText(passwordInput, '123');
    });

    await act(async () => {
      fireEvent.changeText(confirmPasswordInput, '123');
    });

    await act(async () => {
      fireEvent(submitButton, 'press');
    });

    // Should not proceed with wallet creation
    expect(Authentication.newWalletAndKeychain).not.toHaveBeenCalled();
    // Should track the failure
    expect(mockTrackOnboarding).toHaveBeenCalled();
    const trackingEvent = mockTrackOnboarding.mock.calls[0][0];
    expect(trackingEvent.name).toBe(EVENT_NAME.WALLET_SETUP_FAILURE);
    expect(trackingEvent.properties).toEqual({
      wallet_setup_type: 'import',
      error_type: strings('choose_password.password_length_error'),
    });
  });

  it('should track failure and return when passwords do not match on submit', async () => {
    mockTrackOnboarding.mockClear();

    const component = renderWithProviders(<ChoosePassword />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
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
    const submitButton = component.getByTestId(
      ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
    );

    // Enter mismatched passwords
    await act(async () => {
      fireEvent.press(checkbox);
      fireEvent.changeText(passwordInput, 'StrongPassword123');
    });

    await act(async () => {
      fireEvent.changeText(confirmPasswordInput, 'DifferentPassword123');
    });

    await act(async () => {
      fireEvent(submitButton, 'press');
    });

    // Should not proceed with wallet creation
    expect(Authentication.newWalletAndKeychain).not.toHaveBeenCalled();
    // Should track the failure
    expect(mockTrackOnboarding).toHaveBeenCalled();
    const trackingEvent = mockTrackOnboarding.mock.calls[0][0];
    expect(trackingEvent.name).toBe(EVENT_NAME.WALLET_SETUP_FAILURE);
    expect(trackingEvent.properties).toEqual({
      wallet_setup_type: 'import',
      error_type: strings('choose_password.password_dont_match'),
    });
  });

  it('should handle rejected OS biometric prompt', async () => {
    jest.spyOn(Device, 'isIos').mockReturnValue(true);

    // Mock newWalletAndKeychain to throw error first, then succeed
    const mockNewWalletAndKeychain = jest.spyOn(
      Authentication,
      'newWalletAndKeychain',
    );
    mockNewWalletAndKeychain
      .mockRejectedValueOnce(new Error('User rejected biometric prompt'))
      .mockResolvedValueOnce(undefined);

    mockRoute.params = {
      ...mockRoute.params,
      [PREVIOUS_SCREEN]: ONBOARDING,
    };
    const component = renderWithProviders(<ChoosePassword />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
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

    const submitButton = component.getByTestId(
      ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
    );
    await act(async () => {
      fireEvent.press(checkbox);
      fireEvent.changeText(passwordInput, 'StrongPassword123!');
    });

    await act(async () => {
      fireEvent.changeText(confirmPasswordInput, 'StrongPassword123!');
    });

    await act(async () => {
      fireEvent(submitButton, 'press');
    });

    // Should handle the rejection and create wallet with fallback method
    expect(mockNewWalletAndKeychain).toHaveBeenCalledTimes(2);

    jest.spyOn(Device, 'isIos').mockRestore();
    mockNewWalletAndKeychain.mockRestore();
  });

  it('should show alert when passcode not set error occurs', async () => {
    jest.spyOn(Device, 'isIos').mockReturnValue(false);
    const mockComponentAuthenticationType = jest.spyOn(
      Authentication,
      'componentAuthenticationType',
    );
    mockComponentAuthenticationType.mockRejectedValueOnce(
      new Error('Passcode not set.'),
    );

    const component = renderWithProviders(<ChoosePassword />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
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

    const submitButton = component.getByTestId(
      ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
    );

    await act(async () => {
      fireEvent.press(checkbox);
      fireEvent.changeText(passwordInput, 'StrongPassword123!');
    });

    await act(async () => {
      fireEvent.changeText(confirmPasswordInput, 'StrongPassword123!');
    });

    await act(async () => {
      fireEvent(submitButton, 'press');
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      strings('choose_password.security_alert_title'),
      strings('choose_password.security_alert_message'),
    );

    jest.spyOn(Device, 'isIos').mockRestore();
    mockComponentAuthenticationType.mockClear();
  });

  it('should navigate to success screen when oauth2Login is true and metrics enabled', async () => {
    const mockNewWalletAndKeychain = jest.spyOn(
      Authentication,
      'newWalletAndKeychain',
    );
    mockNewWalletAndKeychain.mockResolvedValue(undefined);
    mockMetricsIsEnabled.mockReturnValueOnce(true);
    const spyUpdateMarketingOptInStatus = jest.spyOn(
      OAuthLoginService,
      'updateMarketingOptInStatus',
    );

    spyUpdateMarketingOptInStatus.mockResolvedValue(undefined);

    mockRoute.params = {
      ...mockRoute.params,
      [PREVIOUS_SCREEN]: ONBOARDING,
      oauthLoginSuccess: true,
    };
    const component = renderWithProviders(<ChoosePassword />);

    const passwordInput = component.getByTestId(
      ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
    );
    const confirmPasswordInput = component.getByTestId(
      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
    );
    const checkbox = component.getByTestId(
      ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
    );
    const submitButton = component.getByTestId(
      ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
    );
    await act(async () => {
      fireEvent.press(checkbox);
      fireEvent.changeText(passwordInput, 'StrongPassword123!');
    });

    await act(async () => {
      fireEvent.changeText(confirmPasswordInput, 'StrongPassword123!');
    });

    await act(async () => {
      fireEvent(submitButton, 'press');
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
    });

    // Wait for the animation callback to trigger navigation
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
    });

    mockNewWalletAndKeychain.mockRestore();
  });

  it('should navigate to success screen when oauth2Login is true', async () => {
    const mockNewWalletAndKeychain = jest.spyOn(
      Authentication,
      'newWalletAndKeychain',
    );
    mockNewWalletAndKeychain.mockResolvedValue(undefined);
    mockMetricsIsEnabled.mockReturnValueOnce(true);

    mockRoute.params = {
      ...mockRoute.params,
      [PREVIOUS_SCREEN]: ONBOARDING,
      oauthLoginSuccess: true,
    };
    const component = renderWithProviders(<ChoosePassword />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
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
    const submitButton = component.getByTestId(
      ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
    );

    await act(async () => {
      fireEvent.press(checkbox);
      fireEvent.changeText(passwordInput, 'StrongPassword123!');
    });

    await act(async () => {
      fireEvent.changeText(confirmPasswordInput, 'StrongPassword123!');
    });

    await act(async () => {
      fireEvent(submitButton, 'press');
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
    });

    // Wait for the animation callback to trigger navigation
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
    });

    mockNewWalletAndKeychain.mockRestore();
  });

  it('should navigate to support article when learn more link is pressed when oauth2Login is false', async () => {
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
    expect(learnMoreLink.props.onPress).toBeDefined();

    await act(async () => {
      fireEvent.press(learnMoreLink);
    });

    expect(mockNavigation.push).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://support.metamask.io/managing-my-wallet/resetting-deleting-and-restoring/how-can-i-reset-my-password/',
        title: 'support.metamask.io',
      },
    });
  });

  describe('ErrorBoundary Tests', () => {
    it('should not trigger ErrorBoundary for OAuth password creation failures when analytics enabled', async () => {
      mockMetricsIsEnabled.mockReturnValueOnce(true);
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

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
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
      const submitButton = component.getByTestId(
        ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
      );

      await act(async () => {
        fireEvent.press(checkbox);
        fireEvent.changeText(passwordInput, 'StrongPassword123!');
      });
      await act(async () => {
        fireEvent.changeText(confirmPasswordInput, 'StrongPassword123!');
      });
      await act(async () => {
        fireEvent(submitButton, 'press');
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
      });

      expect(mockNewWalletAndKeychain).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).not.toHaveBeenLastCalledWith(
        expect.objectContaining({
          name: 'Error Screen Viewed',
        }),
      );

      mockNewWalletAndKeychain.mockRestore();
    });
  });
  describe('Marketing API Integration', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should call updateMarketingOptInStatus API when OAuth user creates password with marketing opt-in enabled', async () => {
      const mockNewWalletAndKeychain = jest.spyOn(
        Authentication,
        'newWalletAndKeychain',
      );
      mockNewWalletAndKeychain.mockResolvedValue(undefined);

      mockRoute.params = {
        ...mockRoute.params,
        [PREVIOUS_SCREEN]: ONBOARDING,
        oauthLoginSuccess: true,
      };
      const spyUpdateMarketingOptInStatus = jest.spyOn(
        OAuthLoginService,
        'updateMarketingOptInStatus',
      );

      spyUpdateMarketingOptInStatus.mockResolvedValue(undefined);

      const { getByTestId } = renderWithProviders(<ChoosePassword />);
      const passwordInput = getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      const confirmPasswordInput = getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );
      const createButton = getByTestId(
        ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
      );
      const marketingCheckbox = getByTestId(
        ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
      );

      await act(async () => {
        fireEvent.changeText(passwordInput, 'Test123456!');
        fireEvent.changeText(confirmPasswordInput, 'Test123456!');
      });
      await act(async () => {
        fireEvent.press(marketingCheckbox);
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      await act(async () => {
        fireEvent(createButton, 'press');
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockNewWalletAndKeychain).toHaveBeenCalledTimes(1);
      expect(spyUpdateMarketingOptInStatus).toHaveBeenCalledWith(true);
    });

    it('should call updateMarketingOptInStatus API when OAuth user creates password with marketing opt-in disabled', async () => {
      const mockNewWalletAndKeychain = jest.spyOn(
        Authentication,
        'newWalletAndKeychain',
      );
      mockNewWalletAndKeychain.mockResolvedValue(undefined);

      mockRoute.params = {
        ...mockRoute.params,
        [PREVIOUS_SCREEN]: ONBOARDING,
        oauthLoginSuccess: true,
      };
      const spyUpdateMarketingOptInStatus = jest.spyOn(
        OAuthLoginService,
        'updateMarketingOptInStatus',
      );

      spyUpdateMarketingOptInStatus.mockResolvedValue(undefined);

      const { getByTestId } = renderWithProviders(<ChoosePassword />);
      const passwordInput = getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      const confirmPasswordInput = getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );
      const createButton = getByTestId(
        ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
      );
      await act(async () => {
        fireEvent.changeText(passwordInput, 'Test123456!');
        fireEvent.changeText(confirmPasswordInput, 'Test123456!');
      });
      await act(async () => {
        fireEvent(createButton, 'press');
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockNewWalletAndKeychain).toHaveBeenCalledTimes(1);
      expect(spyUpdateMarketingOptInStatus).toHaveBeenCalledWith(false);
    });
  });
  describe('Tracing functionality', () => {
    const mockTrace = trace as jest.MockedFunction<typeof trace>;
    const mockEndTrace = endTrace as jest.MockedFunction<typeof endTrace>;

    beforeEach(() => {
      jest.clearAllMocks();
      mockTrace.mockClear();
      mockEndTrace.mockClear();
    });

    it('should start and end tracing on component unmount', async () => {
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

    it('should not start or end tracing on component unmount when onboardingTraceCtx is not provided', async () => {
      mockRoute.params = {
        ...mockRoute.params,
        // No onboardingTraceCtx provided,
      };

      const { unmount } = renderWithProviders(<ChoosePassword />);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockTrace).not.toHaveBeenCalled();

      unmount();

      expect(mockEndTrace).not.toHaveBeenCalled();
    });

    it('should trace error when password creation fails', async () => {
      const mockOnboardingTraceCtx = {
        traceId: 'test-trace-id',
      } as unknown as Span;
      const mockTraceCtx = undefined;
      const testError = new Error('Password creation failed');

      mockTrace.mockReturnValue(mockTraceCtx);
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

      const passwordInput = component.getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      const confirmPasswordInput = component.getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );
      const checkbox = component.getByTestId(
        ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
      );
      const submitButton = component.getByTestId(
        ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
      );

      await act(async () => {
        fireEvent.press(checkbox);
        fireEvent.changeText(passwordInput, 'StrongPassword123!');
      });

      await act(async () => {
        fireEvent.changeText(confirmPasswordInput, 'StrongPassword123!');
      });

      await act(async () => {
        fireEvent(submitButton, 'press');
      });

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

    it('should not trace error when onboardingTraceCtx is not provided', async () => {
      const testError = new Error('Password creation failed');

      const mockComponentAuthenticationType = jest.spyOn(
        Authentication,
        'componentAuthenticationType',
      );
      mockComponentAuthenticationType.mockRejectedValueOnce(testError);

      mockRoute.params = {
        ...mockRoute.params,
        [PREVIOUS_SCREEN]: ONBOARDING,
        // No onboardingTraceCtx provided,
      };

      const component = renderWithProviders(<ChoosePassword />);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
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
        fireEvent.press(checkbox);
        fireEvent.changeText(passwordInput, 'StrongPassword123!');
      });

      await act(async () => {
        fireEvent.changeText(confirmPasswordInput, 'StrongPassword123!');
      });

      await act(async () => {
        fireEvent(confirmPasswordInput, 'submitEditing');
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
      });

      // Verify error tracing was not called since no onboardingTraceCtx
      expect(mockTrace).not.toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.OnboardingPasswordSetupError,
        }),
      );

      expect(mockEndTrace).not.toHaveBeenCalledWith({
        name: TraceName.OnboardingPasswordSetupError,
      });
    });

    it('should handle successful password creation without error tracing', async () => {
      const mockOnboardingTraceCtx = {
        traceId: 'test-trace-id',
      } as unknown as Span;
      const mockTraceCtx = undefined;

      mockTrace.mockReturnValue(mockTraceCtx);

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

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
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
        fireEvent.press(checkbox);
        fireEvent.changeText(passwordInput, 'StrongPassword123!');
      });

      await act(async () => {
        fireEvent.changeText(confirmPasswordInput, 'StrongPassword123!');
      });

      await act(async () => {
        fireEvent(confirmPasswordInput, 'submitEditing');
      });

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

    describe('Conditional canSubmit logic - User Experience', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('should allow OAuth users to submit without marketing opt-in checkbox', async () => {
        mockRoute.params = {
          ...mockRoute.params,
          [PREVIOUS_SCREEN]: ONBOARDING,
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
        const submitButton = component.getByTestId(
          ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
        );

        await act(async () => {
          fireEvent.changeText(passwordInput, 'Test1234');
        });

        await act(async () => {
          fireEvent.changeText(confirmPasswordInput, 'Test1234');
        });

        expect(submitButton.props.disabled).toBe(false);
      });

      it('should require marketing opt-in checkbox for non-OAuth users', async () => {
        mockRoute.params = {
          ...mockRoute.params,
          [PREVIOUS_SCREEN]: ONBOARDING,
          oauthLoginSuccess: false,
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
        const submitButton = component.getByTestId(
          ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
        );

        await act(async () => {
          fireEvent.changeText(passwordInput, 'Test1234');
        });

        await act(async () => {
          fireEvent.changeText(confirmPasswordInput, 'Test1234');
        });

        expect(submitButton.props.disabled).toBe(true);
      });

      it('should handle edge case where oauthLoginSuccess is undefined', async () => {
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
        const submitButton = component.getByTestId(
          ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
        );

        await act(async () => {
          fireEvent.changeText(passwordInput, 'Test1234');
        });

        await act(async () => {
          fireEvent.changeText(confirmPasswordInput, 'Test1234');
        });

        expect(submitButton.props.disabled).toBe(true);
      });
    });
  });

  describe('OAuth Login Description Text', () => {
    it('should show iOS-specific description when Platform.OS is ios and OAuth login is successful', async () => {
      // Mock Platform.OS to be 'ios'
      const originalPlatform = Platform.OS;
      Object.defineProperty(Platform, 'OS', {
        writable: true,
        value: 'ios',
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

      // Check that iOS-specific text is rendered
      expect(() =>
        component.getByText(/Use this for wallet recovery/),
      ).not.toThrow();

      Object.defineProperty(Platform, 'OS', {
        writable: true,
        value: originalPlatform,
      });
    });

    it('should show different text when Platform.OS is android and OAuth login is successful', async () => {
      // Mock Platform.OS to be 'android'
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

      // Check that non-iOS text is rendered
      expect(() =>
        component.getByText(/If you lose this password/),
      ).not.toThrow();

      Object.defineProperty(Platform, 'OS', {
        writable: true,
        value: originalPlatform,
      });
    });
  });
});

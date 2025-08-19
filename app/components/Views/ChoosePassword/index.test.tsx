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
import { ChoosePasswordSelectorsIDs } from '../../../../e2e/selectors/Onboarding/ChoosePassword.selectors';
import Device from '../../../util/device';
import StorageWrapper from '../../../store/storage-wrapper';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { BIOMETRY_TYPE } from 'react-native-keychain';
import { Authentication } from '../../../core';
import { InteractionManager, Alert } from 'react-native';
import { EVENT_NAME } from '../../../core/Analytics';
import Logger from '../../../util/Logger';

jest.mock('../../../util/metrics/TrackOnboarding/trackOnboarding');

// Mock the entire trace module
jest.mock('../../../util/trace', () => ({
  ...jest.requireActual('../../../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

import ChoosePassword from './';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import {
  TraceName,
  TraceOperation,
  trace,
  endTrace,
} from '../../../util/trace';

const mockTrackOnboarding = trackOnboarding as jest.MockedFunction<
  typeof trackOnboarding
>;

jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: {
      createNewVaultAndKeychain: jest.fn().mockResolvedValue(true),
      exportSeedPhrase: jest.fn().mockResolvedValue('test seed phrase'),
    },
  },
}));

jest.mock('lottie-react-native', () => 'LottieView');

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
}));

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
jest.mock('../../../core/Analytics/MetaMetrics', () => ({
  getInstance: () => ({
    isEnabled: mockMetricsIsEnabled,
    trackEvent: mockTrackEvent,
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
};
const store = mockStore(initialState);

interface ChoosePasswordProps {
  route: {
    params: {
      [ONBOARDING]?: boolean;
      [PROTECT]?: boolean;
      [PREVIOUS_SCREEN]?: string;
      oauthLoginSuccess?: boolean;
      onboardingTraceCtx?: unknown;
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
  metrics: {
    isEnabled: jest.Mock;
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

const defaultProps: ChoosePasswordProps = {
  route: { params: { [ONBOARDING]: true, [PROTECT]: true } },
  navigation: mockNavigation,
  metrics: {
    isEnabled: mockMetricsIsEnabled,
  },
};

describe('ChoosePassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTrackOnboarding.mockClear();
  });

  it('render matches snapshot', async () => {
    const component = renderWithProviders(<ChoosePassword {...defaultProps} />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(component.toJSON()).toMatchSnapshot();
  });

  it('render loading state while creating password', async () => {
    jest.spyOn(Device, 'isIos').mockReturnValue(true);
    jest.spyOn(Device, 'isMediumDevice').mockReturnValue(true);

    const component = renderWithProviders(<ChoosePassword {...defaultProps} />);

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

    // Check if title text is rendered correctly for loading state
    const loadingTitle = component.getByText(
      strings('secure_your_wallet.creating_password'),
    );
    expect(loadingTitle).toBeTruthy();
    jest.spyOn(Device, 'isIos').mockRestore();
    jest.spyOn(Device, 'isMediumDevice').mockRestore();
  });

  it('error message is shown when passwords do not match', async () => {
    const component = renderWithProviders(<ChoosePassword {...defaultProps} />);

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

  it('render header left button on press, navigates to previous screen', async () => {
    renderWithProviders(<ChoosePassword {...defaultProps} />);

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

    const component = renderWithProviders(<ChoosePassword {...defaultProps} />);

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
    expect(mockStorageWrapper.getItem).toHaveBeenCalledWith(
      '@MetaMask:UserTermsAcceptedv1.0',
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

    const component = renderWithProviders(<ChoosePassword {...defaultProps} />);

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
    expect(mockStorageWrapper.getItem).toHaveBeenCalledWith(
      '@MetaMask:UserTermsAcceptedv1.0',
    );
  });

  it('create a password and navigate to AccountBackupStep1', async () => {
    // Mock Authentication.newWalletAndKeychain to resolve quickly to trigger loading state
    const mockNewWalletAndKeychain = jest.spyOn(
      Authentication,
      'newWalletAndKeychain',
    );

    mockNewWalletAndKeychain.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 50)),
    );

    const props: ChoosePasswordProps = {
      ...defaultProps,
      route: {
        ...defaultProps.route,
        params: {
          ...defaultProps.route.params,
          [PREVIOUS_SCREEN]: ONBOARDING,
        },
      },
    };
    const component = renderWithProviders(<ChoosePassword {...props} />);

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

    // Wait a moment for the loading state to be set and componentDidUpdate to be called
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(mockNavigation.replace).toHaveBeenCalledWith('AccountBackupStep1', {
      seedPhrase: expect.any(Array),
    });

    // // Clean up mock
    mockNewWalletAndKeychain.mockRestore();
  });

  it('confirm password input is cleared when password input is cleared', async () => {
    const props: ChoosePasswordProps = {
      route: { params: { [ONBOARDING]: true } },
      navigation: mockNavigation,
      metrics: {
        isEnabled: jest.fn(),
      },
    };

    const component = renderWithProviders(<ChoosePassword {...props} />);

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

    const component = renderWithProviders(<ChoosePassword {...defaultProps} />);

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

    // Use short password that will fail passwordRequirementsMet
    await act(async () => {
      fireEvent.press(checkbox);
      fireEvent.changeText(passwordInput, '123');
    });

    await act(async () => {
      fireEvent.changeText(confirmPasswordInput, '123');
    });

    await act(async () => {
      fireEvent(confirmPasswordInput, 'submitEditing');
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

    const component = renderWithProviders(<ChoosePassword {...defaultProps} />);

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

    // Enter mismatched passwords
    await act(async () => {
      fireEvent.press(checkbox);
      fireEvent.changeText(passwordInput, 'StrongPassword123');
    });

    await act(async () => {
      fireEvent.changeText(confirmPasswordInput, 'DifferentPassword123');
    });

    await act(async () => {
      fireEvent(confirmPasswordInput, 'submitEditing');
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

    const props: ChoosePasswordProps = {
      ...defaultProps,
      route: {
        ...defaultProps.route,
        params: {
          ...defaultProps.route.params,
          [PREVIOUS_SCREEN]: ONBOARDING,
        },
      },
    };
    const component = renderWithProviders(<ChoosePassword {...props} />);

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

    const component = renderWithProviders(<ChoosePassword {...defaultProps} />);

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

    const props: ChoosePasswordProps = {
      ...defaultProps,
      route: {
        ...defaultProps.route,
        params: {
          ...defaultProps.route.params,
          [PREVIOUS_SCREEN]: ONBOARDING,
          oauthLoginSuccess: true,
        },
      },
      navigation: mockNavigation,
    };
    const component = renderWithProviders(<ChoosePassword {...props} />);

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

    expect(mockNavigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [
        {
          name: 'OnboardingSuccess',
          params: { showPasswordHint: true },
        },
      ],
    });

    mockNewWalletAndKeychain.mockRestore();
  });

  it('should navigate to OptinMetrics when oauth2Login is true and metrics disabled', async () => {
    const mockNewWalletAndKeychain = jest.spyOn(
      Authentication,
      'newWalletAndKeychain',
    );
    mockNewWalletAndKeychain.mockResolvedValue(undefined);
    mockMetricsIsEnabled.mockReturnValueOnce(false);

    const props: ChoosePasswordProps = {
      ...defaultProps,
      route: {
        ...defaultProps.route,
        params: {
          ...defaultProps.route.params,
          [PREVIOUS_SCREEN]: ONBOARDING,
          oauthLoginSuccess: true,
        },
      },
      navigation: mockNavigation,
    };
    const component = renderWithProviders(<ChoosePassword {...props} />);

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

    expect(mockNavigation.navigate).toHaveBeenCalledWith('OptinMetrics', {
      onContinue: expect.any(Function),
    });

    mockNewWalletAndKeychain.mockRestore();
  });

  it('should navigate to support article when learn more link is pressed when oauth2Login is true', async () => {
    const props: ChoosePasswordProps = {
      ...defaultProps,
      route: {
        ...defaultProps.route,
        params: {
          ...defaultProps.route.params,
          [PREVIOUS_SCREEN]: ONBOARDING,
          oauthLoginSuccess: true,
        },
      },
      navigation: mockNavigation,
    };
    const component = renderWithProviders(<ChoosePassword {...props} />);

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
        url: 'https://support.metamask.io/configure/wallet/passwords-and-metamask/',
        title: 'support.metamask.io',
      },
    });
  });

  describe('ErrorBoundary Tests', () => {
    it('should trigger ErrorBoundary for OAuth password creation failures when analytics disabled', async () => {
      const loggerErrorSpy = jest.spyOn(Logger, 'error');
      mockMetricsIsEnabled.mockReturnValueOnce(false);
      const mockNewWalletAndKeychain = jest.spyOn(
        Authentication,
        'newWalletAndKeychain',
      );
      mockNewWalletAndKeychain
        .mockRejectedValueOnce(
          new Error('SeedlessOnboardingController - Auth server is down'),
        )
        .mockResolvedValueOnce(undefined);

      const props: ChoosePasswordProps = {
        ...defaultProps,
        route: {
          ...defaultProps.route,
          params: {
            ...defaultProps.route.params,
            [PREVIOUS_SCREEN]: ONBOARDING,
            oauthLoginSuccess: true,
          },
        },
      };
      const component = renderWithProviders(<ChoosePassword {...props} />);

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

      expect(mockNewWalletAndKeychain).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('OAuth password creation failed'),
        }),
        expect.objectContaining({
          View: 'ChoosePassword',
          ErrorBoundary: true,
        }),
      );
      expect(mockTrackEvent).toHaveBeenLastCalledWith(
        expect.objectContaining({
          name: 'Error Screen Viewed',
        }),
      );

      mockNewWalletAndKeychain.mockRestore();
    });

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

      const props: ChoosePasswordProps = {
        ...defaultProps,
        route: {
          ...defaultProps.route,
          params: {
            ...defaultProps.route.params,
            [PREVIOUS_SCREEN]: ONBOARDING,
            oauthLoginSuccess: true,
          },
        },
      };
      const component = renderWithProviders(<ChoosePassword {...props} />);

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

      expect(mockNewWalletAndKeychain).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).not.toHaveBeenLastCalledWith(
        expect.objectContaining({
          name: 'Error Screen Viewed',
        }),
      );

      mockNewWalletAndKeychain.mockRestore();
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
      const mockOnboardingTraceCtx = { traceId: 'test-trace-id' };
      const mockTraceCtx = { traceId: 'password-setup-trace-id' };

      mockTrace.mockReturnValue(mockTraceCtx);

      const props: ChoosePasswordProps = {
        ...defaultProps,
        route: {
          ...defaultProps.route,
          params: {
            ...defaultProps.route.params,
            onboardingTraceCtx: mockOnboardingTraceCtx,
          },
        },
      };

      const { unmount } = renderWithProviders(<ChoosePassword {...props} />);

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
      const props: ChoosePasswordProps = {
        ...defaultProps,
        route: {
          ...defaultProps.route,
          params: {
            ...defaultProps.route.params,
            // No onboardingTraceCtx provided
          },
        },
      };

      const { unmount } = renderWithProviders(<ChoosePassword {...props} />);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockTrace).not.toHaveBeenCalled();

      unmount();

      expect(mockEndTrace).not.toHaveBeenCalled();
    });

    it('should trace error when password creation fails', async () => {
      const mockOnboardingTraceCtx = { traceId: 'test-trace-id' };
      const mockTraceCtx = { traceId: 'password-setup-trace-id' };
      const testError = new Error('Password creation failed');

      mockTrace.mockReturnValue(mockTraceCtx);
      const mockComponentAuthenticationType = jest.spyOn(
        Authentication,
        'componentAuthenticationType',
      );
      mockComponentAuthenticationType.mockRejectedValueOnce(testError);

      const props: ChoosePasswordProps = {
        ...defaultProps,
        route: {
          ...defaultProps.route,
          params: {
            ...defaultProps.route.params,
            [PREVIOUS_SCREEN]: ONBOARDING,
            onboardingTraceCtx: mockOnboardingTraceCtx,
          },
        },
      };

      const component = renderWithProviders(<ChoosePassword {...props} />);

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

      const props: ChoosePasswordProps = {
        ...defaultProps,
        route: {
          ...defaultProps.route,
          params: {
            ...defaultProps.route.params,
            [PREVIOUS_SCREEN]: ONBOARDING,
            // No onboardingTraceCtx provided
          },
        },
      };

      const component = renderWithProviders(<ChoosePassword {...props} />);

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
      const mockOnboardingTraceCtx = { traceId: 'test-trace-id' };
      const mockTraceCtx = { traceId: 'password-setup-trace-id' };

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

      const props: ChoosePasswordProps = {
        ...defaultProps,
        route: {
          ...defaultProps.route,
          params: {
            ...defaultProps.route.params,
            [PREVIOUS_SCREEN]: ONBOARDING,
            onboardingTraceCtx: mockOnboardingTraceCtx,
          },
        },
      };

      const component = renderWithProviders(<ChoosePassword {...props} />);

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
  });
});

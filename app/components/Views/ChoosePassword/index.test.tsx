import React from 'react';
import { render, act, fireEvent, waitFor } from '@testing-library/react-native';
import ChoosePassword from './';
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
import { InteractionManager } from 'react-native';

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
    };
  };
  navigation?: {
    setOptions: jest.Mock;
    goBack: jest.Mock;
    navigate: jest.Mock;
    push: jest.Mock;
    replace: jest.Mock;
  };
}

const mockNavigation = {
  setOptions: jest.fn(),
  goBack: jest.fn(),
  navigate: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
  setParams: jest.fn(),
};

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <Provider store={store}>
      <ThemeContext.Provider value={mockTheme}>{ui}</ThemeContext.Provider>
    </Provider>,
  );

describe('ChoosePassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('render matches snapshot', async () => {
    const props: ChoosePasswordProps = {
      route: { params: { [ONBOARDING]: true, [PROTECT]: true } },
      navigation: mockNavigation,
    };

    const component = renderWithProviders(<ChoosePassword {...props} />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(component.toJSON()).toMatchSnapshot();
  });

  it('render loading state while creating password', async () => {
    jest.spyOn(Device, 'isIos').mockReturnValue(true);
    const props: ChoosePasswordProps = {
      route: { params: { [ONBOARDING]: true } },
      navigation: mockNavigation,
    };

    const component = renderWithProviders(<ChoosePassword {...props} />);

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
  });

  it('error message is shown when passwords do not match', async () => {
    const props: ChoosePasswordProps = {
      route: { params: { [ONBOARDING]: true } },
      navigation: mockNavigation,
    };

    const component = renderWithProviders(<ChoosePassword {...props} />);

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
    const props: ChoosePasswordProps = {
      route: { params: { [ONBOARDING]: true } },
      navigation: mockNavigation,
    };

    renderWithProviders(<ChoosePassword {...props} />);

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

    const props: ChoosePasswordProps = {
      route: { params: { [ONBOARDING]: true } },
      navigation: mockNavigation,
    };

    const component = renderWithProviders(<ChoosePassword {...props} />);

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

    const props: ChoosePasswordProps = {
      route: { params: { [ONBOARDING]: true } },
      navigation: mockNavigation,
    };

    const component = renderWithProviders(<ChoosePassword {...props} />);

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
      route: { params: { [ONBOARDING]: true, [PREVIOUS_SCREEN]: ONBOARDING } },
      navigation: mockNavigation,
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

    expect(mockNavigation.replace).toHaveBeenCalledWith('AccountBackupStep1');

    // // Clean up mock
    mockNewWalletAndKeychain.mockRestore();
  });

  it('confirm password input is cleared when password input is cleared', async () => {
    const props: ChoosePasswordProps = {
      route: { params: { [ONBOARDING]: true } },
      navigation: mockNavigation,
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
});

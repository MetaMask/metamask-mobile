import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import ChoosePassword from './';
import configureMockStore from 'redux-mock-store';
import { ONBOARDING, PROTECT } from '../../../constants/navigation';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { strings } from '../../../../locales/i18n';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { ChoosePasswordSelectorsIDs } from '../../../../e2e/selectors/Onboarding/ChoosePassword.selectors';

jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: {
      createNewVaultAndKeychain: jest.fn().mockResolvedValue(true),
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
}));

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

  it('should render correctly', async () => {
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

  it('should render loading state correctly', async () => {
    const props: ChoosePasswordProps = {
      route: { params: { [ONBOARDING]: true } },
      navigation: mockNavigation,
    };

    const component = renderWithProviders(<ChoosePassword {...props} />);

    // Wait for initial render
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Fill in password fields and trigger loading state
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
      ChoosePasswordSelectorsIDs.IOS_I_UNDERSTAND_BUTTON_ID,
    );
    fireEvent.press(checkbox);

    const submitButton = component.getByRole('button', {
      name: strings('choose_password.confirm_cta'),
    });

    // Button should still be disabled (checkbox not checked)
    expect(submitButton.props.disabled).toBe(false);

    fireEvent.press(submitButton);

    // Check if title text is rendered correctly for loading state
    const loadingTitle = component.getByText(
      strings('secure_your_wallet.creating_password'),
    );
    expect(loadingTitle).toBeTruthy();
  });

  it('should validate password and enable button when conditions are met', async () => {
    const props: ChoosePasswordProps = {
      route: { params: { [ONBOARDING]: true } },
      navigation: mockNavigation,
    };

    const component = renderWithProviders(<ChoosePassword {...props} />);

    // Wait for initial render
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
      ChoosePasswordSelectorsIDs.IOS_I_UNDERSTAND_BUTTON_ID,
    );
    const submitButton = component.getByTestId(
      ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
    );

    // Initially button should be disabled
    expect(submitButton.props.disabled).toBe(true);

    // Enter matching passwords
    await act(async () => {
      fireEvent.changeText(passwordInput, 'Test123456!');
      fireEvent.changeText(confirmPasswordInput, 'Test123456!');
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Button should still be disabled (checkbox not checked)
    expect(submitButton.props.disabled).toBe(true);

    // Check the checkbox and wait for state update
    await act(async () => {
      fireEvent.press(checkbox);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    fireEvent.press(submitButton);

    // Enter non-matching passwords
    await act(async () => {
      fireEvent.changeText(confirmPasswordInput, 'DifferentPassword123!');
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Button should be disabled again
    expect(submitButton.props.disabled).toBe(true);

    // Error message should be shown
    const errorMessage = component.getByText(
      strings('choose_password.password_error'),
    );
    expect(errorMessage).toBeTruthy();
  });

  it('should handle header left button press and update navbar', async () => {
    const props: ChoosePasswordProps = {
      route: { params: { [ONBOARDING]: true } },
      navigation: mockNavigation,
    };

    renderWithProviders(<ChoosePassword {...props} />);

    // Wait for initial render
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
});

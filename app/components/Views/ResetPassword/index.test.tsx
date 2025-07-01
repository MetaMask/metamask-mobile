import React from 'react';
import ResetPassword from './';
import { render, act, fireEvent, waitFor } from '@testing-library/react-native';
import configureMockStore from 'redux-mock-store';
import { PREVIOUS_SCREEN } from '../../../constants/navigation';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { ChoosePasswordSelectorsIDs } from '../../../../e2e/selectors/Onboarding/ChoosePassword.selectors';
import { InteractionManager } from 'react-native';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import { strings } from '../../../../locales/i18n';
// import Engine from '../../../core/Engine';

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

jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

const mockMetricsIsEnabled = jest.fn().mockReturnValue(true);
jest.mock('../../../core/Analytics/MetaMetrics', () => ({
  getInstance: () => ({
    isEnabled: mockMetricsIsEnabled,
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

const defaultProps: ResetPasswordProps = {
  route: { params: { [PREVIOUS_SCREEN]: 'ChoosePassword' } },
  navigation: mockNavigation,
};

describe('ResetPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTrackOnboarding.mockClear();
    mockExportSeedPhrase.mockClear();
  });

  it('render matches snapshot', async () => {
    const component = renderWithProviders(<ResetPassword {...defaultProps} />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(component.toJSON()).toMatchSnapshot();
  });

  describe('Confirm Password UI', () => {
    it('should render the confirm password view initially', async () => {
      const component = renderWithProviders(
        <ResetPassword {...defaultProps} />,
      );
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Verify we're in the confirm password view
      const passwordInput = component.getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      const submitButton = component.getByTestId(
        ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
      );

      expect(passwordInput).toBeOnTheScreen();
      expect(submitButton).toBeOnTheScreen();
    });

    it('should test mock directly', async () => {
      // Test the mock directly to ensure it's working
      mockExportSeedPhrase.mockResolvedValue('test result');

      // Test the mock function directly
      const result = await mockExportSeedPhrase('test');
      expect(result).toBe('test result');
      expect(mockExportSeedPhrase).toHaveBeenCalledWith('test');
    });

    it('should test the mock directly', async () => {
      // Test the mock directly to ensure it's working
      mockExportSeedPhrase.mockResolvedValue('test result');

      const component = renderWithProviders(
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
    });
  });
});

import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import CardAuthentication from './CardAuthentication';
import Routes from '../../../../../constants/navigation/Routes';
import { CardAuthenticationSelectors } from './CardAuthentication.testIds';
import { CardLocation } from '../../types';
import { backgroundState } from '../../../../../util/test/initial-root-state';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockReset = jest.fn();
const mockDispatch = jest.fn();
const mockAddListener = jest.fn(() => jest.fn());

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    reset: mockReset,
    dispatch: mockDispatch,
    addListener: mockAddListener,
  }),
}));

jest.mock('@react-navigation/compat', () => ({
  NavigationActions: {
    navigate: jest.fn((params) => ({ type: 'NAVIGATE', ...params })),
  },
}));

const mockLogin = jest.fn();
const mockClearError = jest.fn();
const mockSendOtpLogin = jest.fn();
const mockClearOtpError = jest.fn();

jest.mock('../../hooks/useCardProviderAuthentication', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    login: mockLogin,
    loading: false,
    error: null,
    clearError: mockClearError,
    sendOtpLogin: mockSendOtpLogin,
    otpLoading: false,
    otpError: null,
    clearOtpError: mockClearOtpError,
  })),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: { default: '#FFFFFF' },
      text: { primary: '#000000', alternative: '#666666' },
      primary: { default: '#037DD6' },
      error: { default: '#D73A49', muted: '#FEF2F2' },
      border: { default: '#E1E4E8' },
    },
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const mockStrings: { [key: string]: string } = {
      'card.card_authentication.title': 'Log in to your card account',
      'card.card_authentication.location_button_text': 'International',
      'card.card_authentication.location_button_text_us': 'United States',
      'card.card_authentication.email_label': 'Email',
      'card.card_authentication.password_label': 'Password',
      'card.card_authentication.login_button': 'Log in',
      'card.card_authentication.signup_button': "I don't have an account",
      'card.card_authentication.errors.invalid_credentials':
        'Invalid login details',
      'card.card_authentication.errors.network_error':
        'Network error. Please check your connection and try again.',
      'card.card_authentication.errors.unknown_error':
        'Unknown error, please try again later',
    };
    return mockStrings[key] || key;
  },
}));

import useCardProviderAuthentication from '../../hooks/useCardProviderAuthentication';
const mockUseCardProviderAuthentication =
  useCardProviderAuthentication as jest.MockedFunction<
    typeof useCardProviderAuthentication
  >;

function render() {
  return renderScreen(
    CardAuthentication,
    {
      name: Routes.CARD.AUTHENTICATION,
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

describe('CardAuthentication Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockLogin.mockResolvedValue(undefined);
    mockClearError.mockImplementation(jest.fn());
    mockSendOtpLogin.mockResolvedValue(undefined);
    mockClearOtpError.mockImplementation(jest.fn());

    mockUseCardProviderAuthentication.mockReturnValue({
      login: mockLogin,
      loading: false,
      error: null,
      clearError: mockClearError,
      sendOtpLogin: mockSendOtpLogin,
      otpLoading: false,
      otpError: null,
      clearOtpError: mockClearOtpError,
    });
  });

  describe('Login Step - Component Rendering', () => {
    it('renders all login form elements', () => {
      render();

      expect(screen.getByText('Log in to your card account')).toBeOnTheScreen();
      expect(
        screen.getByTestId('international-location-box'),
      ).toBeOnTheScreen();
      expect(screen.getByTestId('us-location-box')).toBeOnTheScreen();
      expect(screen.getByText('Email')).toBeOnTheScreen();
      expect(screen.getByText('Password')).toBeOnTheScreen();
      expect(screen.getByTestId('email-field')).toBeOnTheScreen();
      expect(screen.getByTestId('password-field')).toBeOnTheScreen();
      expect(
        screen.getByTestId(CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON),
      ).toBeOnTheScreen();
    });

    it('matches login step snapshot', () => {
      const { toJSON } = render();

      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Login Step - Location Selection', () => {
    it('defaults to international location', () => {
      render();

      const internationalBox = screen.getByTestId('international-location-box');
      expect(internationalBox).toBeOnTheScreen();
    });

    it('switches back to international from US location', () => {
      render();

      const usBox = screen.getByTestId('us-location-box');
      fireEvent.press(usBox);

      const internationalBox = screen.getByTestId('international-location-box');
      fireEvent.press(internationalBox);

      expect(internationalBox).toBeOnTheScreen();
    });
  });

  describe('Login Step - Form Input', () => {
    it('updates email field when user types', () => {
      render();
      const emailInput = screen.getByTestId('email-field');

      fireEvent.changeText(emailInput, 'test@example.com');

      expect(emailInput).toHaveProp('value', 'test@example.com');
    });

    it('updates password field when user types', () => {
      render();
      const passwordInput = screen.getByTestId('password-field');

      fireEvent.changeText(passwordInput, 'password123');

      expect(passwordInput).toHaveProp('value', 'password123');
    });

    it('clears error when user types in email field with existing error', () => {
      mockUseCardProviderAuthentication.mockReturnValue({
        login: mockLogin,
        loading: false,
        error: 'Invalid login details',
        clearError: mockClearError,
        sendOtpLogin: mockSendOtpLogin,
        otpLoading: false,
        otpError: null,
        clearOtpError: mockClearOtpError,
      });
      render();
      const emailInput = screen.getByTestId('email-field');

      fireEvent.changeText(emailInput, 'test@example.com');

      expect(mockClearError).toHaveBeenCalled();
    });

    it('clears error when user types in password field with existing error', () => {
      mockUseCardProviderAuthentication.mockReturnValue({
        login: mockLogin,
        loading: false,
        error: 'Invalid login details',
        clearError: mockClearError,
        sendOtpLogin: mockSendOtpLogin,
        otpLoading: false,
        otpError: null,
        clearOtpError: mockClearOtpError,
      });
      render();
      const passwordInput = screen.getByTestId('password-field');

      fireEvent.changeText(passwordInput, 'password123');

      expect(mockClearError).toHaveBeenCalled();
    });

    it('does not call clearError when typing with no existing error', () => {
      render();
      const emailInput = screen.getByTestId('email-field');

      fireEvent.changeText(emailInput, 'test@example.com');

      expect(mockClearError).not.toHaveBeenCalled();
    });
  });

  describe('Login Step - Login Functionality', () => {
    it('calls login with correct parameters for international location', async () => {
      render();
      const emailInput = screen.getByTestId('email-field');
      const passwordInput = screen.getByTestId('password-field');
      const loginButton = screen.getByTestId(
        CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON,
      );

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          location: 'international',
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    it('calls login with US location when selected', async () => {
      render();
      const usBox = screen.getByTestId('us-location-box');
      const emailInput = screen.getByTestId('email-field');
      const passwordInput = screen.getByTestId('password-field');
      const loginButton = screen.getByTestId(
        CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON,
      );

      fireEvent.press(usBox);
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          location: 'us' as CardLocation,
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    it('navigates to card home on successful login without OTP', async () => {
      mockLogin.mockResolvedValue(undefined);
      render();
      const emailInput = screen.getByTestId('email-field');
      const passwordInput = screen.getByTestId('password-field');
      const loginButton = screen.getByTestId(
        CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON,
      );

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledWith({
          index: 0,
          routes: [{ name: Routes.CARD.HOME }],
        });
      });
    });

    it('does not navigate when login error exists', async () => {
      mockUseCardProviderAuthentication.mockReturnValue({
        login: mockLogin,
        loading: false,
        error: 'Invalid login details',
        clearError: mockClearError,
        sendOtpLogin: mockSendOtpLogin,
        otpLoading: false,
        otpError: null,
        clearOtpError: mockClearOtpError,
      });

      render();
      const emailInput = screen.getByTestId('email-field');
      const passwordInput = screen.getByTestId('password-field');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      expect(mockReset).not.toHaveBeenCalled();
      expect(screen.getByTestId('login-error-text')).toBeOnTheScreen();
    });

    it('submits form when password field enter key is pressed', async () => {
      mockLogin.mockResolvedValue(undefined);

      render();
      const emailInput = screen.getByTestId('email-field');
      const passwordInput = screen.getByTestId('password-field');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent(passwordInput, 'submitEditing');

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          location: 'international',
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });
  });

  describe('Login Step - Loading State', () => {
    it('shows loading state during login', async () => {
      let resolveLogin: (() => void) | undefined;
      const loginPromise = new Promise<void>((resolve) => {
        resolveLogin = resolve;
      });
      mockLogin.mockReturnValue(loginPromise);

      render();
      const emailInput = screen.getByTestId('email-field');
      const passwordInput = screen.getByTestId('password-field');
      const loginButton = screen.getByTestId(
        CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON,
      );

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(loginButton).toHaveProp('loading', true);
      });

      if (resolveLogin) {
        resolveLogin();
      }

      await waitFor(() => {
        expect(loginButton).toHaveProp('loading', false);
      });
    });
  });

  describe('Login Step - Error Handling', () => {
    it('displays error message when login error exists', () => {
      mockUseCardProviderAuthentication.mockReturnValue({
        login: mockLogin,
        loading: false,
        error: 'Invalid login details',
        clearError: mockClearError,
        sendOtpLogin: mockSendOtpLogin,
        otpLoading: false,
        otpError: null,
        clearOtpError: mockClearOtpError,
      });

      render();

      expect(screen.getByText('Invalid login details')).toBeOnTheScreen();
    });

    it('does not display error box when no error exists', () => {
      render();

      expect(screen.queryByText('Invalid login details')).not.toBeOnTheScreen();
    });

    it('displays network error message correctly', () => {
      mockUseCardProviderAuthentication.mockReturnValue({
        login: mockLogin,
        loading: false,
        error: 'Network error. Please check your connection and try again.',
        clearError: mockClearError,
        sendOtpLogin: mockSendOtpLogin,
        otpLoading: false,
        otpError: null,
        clearOtpError: mockClearOtpError,
      });

      render();

      expect(
        screen.getByText(
          'Network error. Please check your connection and try again.',
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('Login Step - Accessibility', () => {
    it('has accessibility labels for email input', () => {
      render();

      const emailInput = screen.getByTestId('email-field');

      expect(emailInput).toHaveProp('accessibilityLabel', 'Email');
    });

    it('has accessibility labels for password input', () => {
      render();

      const passwordInput = screen.getByTestId('password-field');

      expect(passwordInput).toHaveProp('accessibilityLabel', 'Password');
    });

    it('has email keyboard type for email input', () => {
      render();

      const emailInput = screen.getByTestId('email-field');

      expect(emailInput).toHaveProp('keyboardType', 'email-address');
    });

    it('has secure text entry for password input', () => {
      render();

      const passwordInput = screen.getByTestId('password-field');

      expect(passwordInput).toHaveProp('secureTextEntry', true);
    });

    it('has correct return key types for form navigation', () => {
      render();

      const emailInput = screen.getByTestId('email-field');
      expect(emailInput).toHaveProp('returnKeyType', 'next');

      const passwordInput = screen.getByTestId('password-field');
      expect(passwordInput).toHaveProp('returnKeyType', 'done');
    });
  });
});

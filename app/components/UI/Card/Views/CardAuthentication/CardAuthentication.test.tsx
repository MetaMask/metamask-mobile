import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import CardAuthentication from './CardAuthentication';
import Routes from '../../../../../constants/navigation/Routes';
import { CardAuthenticationSelectors } from '../../../../../../e2e/selectors/Card/CardAuthentication.selectors';
import { CardLocation } from '../../types';
import { backgroundState } from '../../../../../util/test/initial-root-state';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockDispatch = jest.fn();
const mockAddListener = jest.fn(() => jest.fn());

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
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

jest.mock('../../hooks/useCardProviderAuthentication', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    login: mockLogin,
    loading: false,
    error: null,
    clearError: mockClearError,
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

jest.mock('./CardAuthentication.styles', () => ({
  __esModule: true,
  default: () => ({
    keyboardAvoidingView: { flex: 1 },
    safeAreaView: { flex: 1 },
    container: { flex: 1, paddingHorizontal: 16 },
    scrollViewContentContainer: { flexGrow: 1 },
    imageWrapper: { alignItems: 'center', marginTop: 28 },
    image: { height: 80 },
    title: { marginTop: 24, textAlign: 'center' },
    locationButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 24,
    },
    locationButton: {
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#E1E4E8',
      width: '48%',
      alignItems: 'center',
    },
    locationButtonSelected: { borderColor: '#037DD6' },
    locationButtonText: { marginTop: 4, textAlign: 'center' },
    usFlag: { fontSize: 20, textAlign: 'center' },
    textFieldsContainer: { marginTop: 24, gap: 16 },
    label: { marginBottom: 6 },
    errorBox: {
      marginBottom: 16,
      padding: 12,
      borderRadius: 8,
      backgroundColor: '#FEF2F2',
    },
    button: { marginTop: 28, marginBottom: 32 },
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const mockStrings: { [key: string]: string } = {
      'card.card_authentication.title': 'Log in to your Card account',
      'card.card_authentication.location_button_text': 'International',
      'card.card_authentication.location_button_text_us': 'US account',
      'card.card_authentication.email_label': 'Email',
      'card.card_authentication.password_label': 'Password',
      'card.card_authentication.email_placeholder': 'Enter your email address',
      'card.card_authentication.password_placeholder': 'Enter your password',
      'card.card_authentication.login_button': 'Log in',
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

    mockUseCardProviderAuthentication.mockReturnValue({
      login: mockLogin,
      loading: false,
      error: null,
      clearError: mockClearError,
    });
  });

  describe('Component Rendering', () => {
    it('renders all form elements correctly', () => {
      render();

      expect(
        screen.getByTestId(CardAuthenticationSelectors.FOX_IMAGE),
      ).toBeOnTheScreen();
      expect(screen.getByText('Log in to your Card account')).toBeOnTheScreen();
      expect(screen.getByText('International')).toBeOnTheScreen();
      expect(screen.getByText('US account')).toBeOnTheScreen();
      expect(screen.getByText('Email')).toBeOnTheScreen();
      expect(screen.getByText('Password')).toBeOnTheScreen();
      expect(
        screen.getByPlaceholderText('Enter your email address'),
      ).toBeOnTheScreen();
      expect(
        screen.getByPlaceholderText('Enter your password'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON),
      ).toBeOnTheScreen();
    });

    it('matches snapshot', () => {
      const { toJSON } = render();

      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Location Selection', () => {
    it('selects international location by default', () => {
      render();

      const internationalButton = screen.getByText('International');
      expect(internationalButton).toBeOnTheScreen();

      const usButton = screen.getByText('US account');
      expect(usButton).toBeOnTheScreen();
    });

    it('switches to US location when US button is pressed', () => {
      render();

      const usButton = screen.getByText('US account');
      fireEvent.press(usButton);

      expect(usButton).toBeOnTheScreen();
    });

    it('switches back to international when international button is pressed after selecting US', () => {
      render();

      const usButton = screen.getByText('US account');
      fireEvent.press(usButton);

      const internationalButton = screen.getByText('International');
      fireEvent.press(internationalButton);

      expect(internationalButton).toBeOnTheScreen();
    });
  });

  describe('Form Input Handling', () => {
    it('updates email when user types in email field', () => {
      render();
      const emailInput = screen.getByPlaceholderText(
        'Enter your email address',
      );

      fireEvent.changeText(emailInput, 'test@example.com');

      expect(emailInput).toHaveProp('value', 'test@example.com');
    });

    it('updates password when user types in password field', () => {
      render();
      const passwordInput = screen.getByPlaceholderText('Enter your password');

      fireEvent.changeText(passwordInput, 'password123');

      expect(passwordInput).toHaveProp('value', 'password123');
    });

    it('clears error when user starts typing in email field', () => {
      mockUseCardProviderAuthentication.mockReturnValue({
        login: mockLogin,
        loading: false,
        error: 'Invalid login details',
        clearError: mockClearError,
      });
      render();
      const emailInput = screen.getByPlaceholderText(
        'Enter your email address',
      );

      fireEvent.changeText(emailInput, 'test@example.com');

      expect(mockClearError).toHaveBeenCalled();
    });

    it('clears error when user starts typing in password field', () => {
      mockUseCardProviderAuthentication.mockReturnValue({
        login: mockLogin,
        loading: false,
        error: 'Invalid login details',
        clearError: mockClearError,
      });
      render();
      const passwordInput = screen.getByPlaceholderText('Enter your password');

      fireEvent.changeText(passwordInput, 'password123');

      expect(mockClearError).toHaveBeenCalled();
    });

    it('does not call clearError when typing and no error exists', () => {
      render();
      const emailInput = screen.getByPlaceholderText(
        'Enter your email address',
      );

      fireEvent.changeText(emailInput, 'test@example.com');

      expect(mockClearError).not.toHaveBeenCalled();
    });
  });

  describe('Login Functionality', () => {
    it('calls login with correct parameters when login button is pressed', async () => {
      render();
      const emailInput = screen.getByPlaceholderText(
        'Enter your email address',
      );
      const passwordInput = screen.getByPlaceholderText('Enter your password');
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

    it('calls login with US location when US is selected', async () => {
      render();
      const usButton = screen.getByText('US account');
      const emailInput = screen.getByPlaceholderText(
        'Enter your email address',
      );
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const loginButton = screen.getByTestId(
        CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON,
      );

      fireEvent.press(usButton);
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

    it('navigates to card home on successful login', async () => {
      mockLogin.mockResolvedValue(undefined);
      render();
      const emailInput = screen.getByPlaceholderText(
        'Enter your email address',
      );
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const loginButton = screen.getByTestId(
        CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON,
      );

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'NAVIGATE',
          routeName: Routes.CARD.HOME,
        });
      });
    });

    it('does not navigate when login fails', async () => {
      mockLogin.mockRejectedValue(new Error('Invalid credentials'));
      render();
      const emailInput = screen.getByPlaceholderText(
        'Enter your email address',
      );
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const loginButton = screen.getByTestId(
        CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON,
      );

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('supports form submission via password field enter key', async () => {
      render();
      const emailInput = screen.getByPlaceholderText(
        'Enter your email address',
      );
      const passwordInput = screen.getByPlaceholderText('Enter your password');

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

  describe('Loading State', () => {
    it('shows loading state on login button when loading', () => {
      mockUseCardProviderAuthentication.mockReturnValue({
        login: mockLogin,
        loading: true,
        error: null,
        clearError: mockClearError,
      });

      render();

      const loginButton = screen.getByTestId(
        CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON,
      );
      expect(loginButton).toHaveProp('loading', true);
    });

    it('registers beforeRemove navigation listener', () => {
      mockUseCardProviderAuthentication.mockReturnValue({
        login: mockLogin,
        loading: true,
        error: null,
        clearError: mockClearError,
      });

      render();

      expect(mockAddListener).toHaveBeenCalledWith(
        'beforeRemove',
        expect.any(Function),
      );
    });
  });

  describe('Error Handling', () => {
    it('displays error message when error exists', () => {
      mockUseCardProviderAuthentication.mockReturnValue({
        login: mockLogin,
        loading: false,
        error: 'Invalid login details',
        clearError: mockClearError,
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
      });

      render();

      expect(
        screen.getByText(
          'Network error. Please check your connection and try again.',
        ),
      ).toBeOnTheScreen();
    });

    it('displays unknown error message correctly', () => {
      mockUseCardProviderAuthentication.mockReturnValue({
        login: mockLogin,
        loading: false,
        error: 'Unknown error, please try again later',
        clearError: mockClearError,
      });

      render();

      expect(
        screen.getByText('Unknown error, please try again later'),
      ).toBeOnTheScreen();
    });
  });

  describe('Navigation Listener Cleanup', () => {
    it('sets up navigation listener with cleanup function', () => {
      const mockUnsubscribe = jest.fn();
      mockAddListener.mockReturnValue(mockUnsubscribe);

      render();

      expect(mockAddListener).toHaveBeenCalledWith(
        'beforeRemove',
        expect.any(Function),
      );
      expect(mockAddListener).toHaveReturnedWith(mockUnsubscribe);
    });
  });

  describe('Accessibility', () => {
    it('has proper accessibility labels for form fields', () => {
      render();

      const emailInput = screen.getByPlaceholderText(
        'Enter your email address',
      );
      const passwordInput = screen.getByPlaceholderText('Enter your password');

      expect(emailInput).toHaveProp('accessibilityLabel');
      expect(passwordInput).toHaveProp('accessibilityLabel');
    });

    it('has proper keyboard types for input fields', () => {
      render();

      const emailInput = screen.getByPlaceholderText(
        'Enter your email address',
      );
      expect(emailInput).toHaveProp('keyboardType', 'email-address');

      const passwordInput = screen.getByPlaceholderText('Enter your password');
      expect(passwordInput).toHaveProp('secureTextEntry', true);
    });

    it('has proper return key types for form navigation', () => {
      render();

      const emailInput = screen.getByPlaceholderText(
        'Enter your email address',
      );
      expect(emailInput).toHaveProp('returnKeyType', 'next');

      const passwordInput = screen.getByPlaceholderText('Enter your password');
      expect(passwordInput).toHaveProp('returnKeyType', 'done');
    });
  });
});

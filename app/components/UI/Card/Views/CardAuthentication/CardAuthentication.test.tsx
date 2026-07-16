import React from 'react';
import { fireEvent, screen, waitFor, act } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import CardAuthentication from './CardAuthentication';
import Routes from '../../../../../constants/navigation/Routes';
import { CardAuthenticationSelectors } from './CardAuthentication.testIds';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { useCardAuth } from '../../hooks/useCardAuth';

// Mock whenEngineReady to prevent async polling after test teardown
jest.mock('../../../../../util/analytics/whenEngineReady', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      CardController: {
        setUserLocation: jest.fn(),
      },
    },
  },
}));

const mockNavigationServiceNavigate = jest.fn();
const mockNavigationServiceGoBack = jest.fn();
jest.mock('../../../../../core/NavigationService', () => ({
  __esModule: true,
  default: {
    get navigation() {
      return {
        navigate: mockNavigationServiceNavigate,
        goBack: mockNavigationServiceGoBack,
      };
    },
  },
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockReset = jest.fn();
const mockDispatch = jest.fn();
const mockAddListener = jest.fn(() => jest.fn());

let mockRouteParams: Record<string, unknown> = {};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    reset: mockReset,
    dispatch: mockDispatch,
    addListener: mockAddListener,
  }),
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('../../hooks/useCardAuth');

let mockIsForgotPasswordEnabled = true;
let mockIsImmersveEnabled = false;
jest.mock('../../../../../selectors/featureFlagController/card', () => ({
  ...jest.requireActual('../../../../../selectors/featureFlagController/card'),
  selectCardForgotPasswordFeatureEnabled: () => mockIsForgotPasswordEnabled,
  selectImmersveOnboardingEnabled: () => mockIsImmersveEnabled,
}));

const mockResumeImmersveOnboarding = jest.fn();
jest.mock('../../hooks/useImmersveResumeOnboarding', () => ({
  useImmersveResumeOnboarding: () => mockResumeImmersveOnboarding,
}));
// All-numeric hex → safeToChecksumAddress is a no-op, so the resolved address
// equals this constant exactly.
const IMMERSVE_TEST_ADDRESS = '0x1234567890123456789012345678901234567890';
jest.mock('../../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: () => () => ({
    address: IMMERSVE_TEST_ADDRESS,
  }),
}));
jest.mock('../../../../hooks/multichainAccounts/useAccountGroupName', () => ({
  useAccountGroupName: () => 'Account 1',
}));
const mockAccountSelectorNavDetails = [
  'AccountSelectorRoute',
  { screen: 'AccountSelector' },
];
jest.mock('../../../../Views/AccountSelector', () => ({
  createAccountSelectorNavDetails: jest.fn(() => mockAccountSelectorNavDetails),
}));

const mockUseCardAuth = useCardAuth as jest.MockedFunction<typeof useCardAuth>;

const mockInitiateMutateAsync = jest.fn();
const mockSubmitMutateAsync = jest.fn();
const mockStepActionMutate = jest.fn();
const mockInitiateReset = jest.fn();
const mockSubmitReset = jest.fn();
const mockStepActionReset = jest.fn();
const mockResetToLogin = jest.fn();
const mockGetErrorMessage = jest.fn(
  (err: unknown) => (err as Error)?.message ?? 'Unknown error',
);

/** DS TextField forwards `inputProps.testID` to the inner TextInput. */
function getLoginTextInput(fieldTestId: string) {
  return screen.getByTestId(fieldTestId);
}

function makeDefaultHookReturn(
  overrides: Record<string, unknown> = {},
): ReturnType<typeof useCardAuth> {
  return {
    currentStep: { type: 'email_password' },
    initiate: {
      mutateAsync: mockInitiateMutateAsync,
      isPending: false,
      error: null,
      reset: mockInitiateReset,
    },
    submit: {
      mutateAsync: mockSubmitMutateAsync,
      isPending: false,
      error: null,
      reset: mockSubmitReset,
    },
    stepAction: {
      mutate: mockStepActionMutate,
      isPending: false,
      error: null,
      reset: mockStepActionReset,
    },
    logout: { mutate: jest.fn() } as never,
    resetToLogin: mockResetToLogin,
    getErrorMessage: mockGetErrorMessage,
    ...overrides,
  } as unknown as ReturnType<typeof useCardAuth>;
}

jest.mock('../../../../../util/theme', () => {
  const actual = jest.requireActual('../../../../../util/theme');
  return {
    ...actual,
    useTheme: () => ({
      ...actual.mockTheme,
      colors: {
        ...actual.mockTheme.colors,
        text: {
          ...actual.mockTheme.colors.text,
          primary: actual.mockTheme.colors.text.default,
        },
      },
    }),
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, string>) => {
    const mockStrings: { [key: string]: string } = {
      'card.card_authentication.title': 'Log in to your card account',
      'card.card_otp_authentication.title': 'Enter your verification code',
      'card.card_authentication.location_button_text': 'International',
      'card.card_authentication.location_button_text_us': 'United States',
      'card.card_authentication.location_button_text_uk': 'United Kingdom',
      'card.card_authentication.email_label': 'Email',
      'card.card_authentication.password_label': 'Password',
      'card.card_authentication.login_button': 'Log in',
      'card.card_authentication.uk_login_button': 'Sign in with this account',
      'card.card_onboarding.sign_up.account_label': 'Account',
      'card.card_onboarding.sign_up.account_description':
        'Card will be associated with this account',
      'card.card_authentication.signup_button': "I don't have an account",
      'card.card_authentication.forgot_password_button': 'Forgot password?',
      'card.card_authentication.errors.invalid_credentials':
        'Invalid login details',
      'card.card_authentication.errors.network_error':
        'Network error. Please check your connection and try again.',
      'card.card_authentication.errors.unknown_error':
        'Unknown error, please try again later',
      'card.card_otp_authentication.confirm_button': 'Confirm',
      'card.card_otp_authentication.back_to_login_button': 'Back to login',
      'card.card_otp_authentication.confirm_code_label': 'Verification code',
      'card.card_otp_authentication.didnt_receive_code':
        "Didn't receive the code?",
      'card.card_otp_authentication.resend_verification': 'Resend',
      'card.card_authentication.auth_prompt_info':
        'Log in to your card account to access this feature.',
    };
    if (key === 'card.card_otp_authentication.description_with_phone_number') {
      return `We sent a code to ${params?.maskedPhoneNumber}`;
    }
    if (
      key === 'card.card_otp_authentication.description_without_phone_number'
    ) {
      return 'We sent a verification code to your phone';
    }
    if (key === 'card.card_otp_authentication.resend_cooldown') {
      return `Resend code in ${params?.seconds} seconds`;
    }
    return mockStrings[key] || key;
  },
}));

function render(location: 'international' | 'us' = 'international') {
  return renderScreen(
    CardAuthentication,
    {
      name: Routes.CARD.AUTHENTICATION,
    },
    {
      state: {
        engine: {
          backgroundState: {
            ...backgroundState,
            CardController: {
              ...backgroundState.CardController,
              providerData: { baanx: { location } },
            },
          },
        },
      },
    },
  );
}

jest.useFakeTimers({ advanceTimers: true });

describe('CardAuthentication Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsForgotPasswordEnabled = true;
    mockIsImmersveEnabled = false;
    mockRouteParams = {};

    mockInitiateMutateAsync.mockResolvedValue(undefined);
    mockSubmitMutateAsync.mockResolvedValue({ done: true });
    mockStepActionMutate.mockImplementation(
      (_arg: unknown, opts: { onSuccess?: () => void } = {}) => {
        opts.onSuccess?.();
      },
    );

    mockUseCardAuth.mockReturnValue(makeDefaultHookReturn());
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

    it('renders signup button and password toggle', () => {
      render();

      expect(
        screen.getByTestId(CardAuthenticationSelectors.SIGNUP_BUTTON),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('password-visibility-toggle'),
      ).toBeOnTheScreen();
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
      const emailField = screen.getByTestId('email-field');

      fireEvent.changeText(emailField, 'test@example.com');

      expect(emailField).toHaveDisplayValue('test@example.com');
    });

    it('updates password field when user types', () => {
      render();
      const passwordField = screen.getByTestId('password-field');

      fireEvent.changeText(passwordField, 'password123');

      expect(passwordField).toHaveDisplayValue('password123');
    });

    it('resets submit error when user types in email field', () => {
      mockUseCardAuth.mockReturnValue(
        makeDefaultHookReturn({
          submit: {
            mutateAsync: mockSubmitMutateAsync,
            isPending: false,
            error: new Error('Invalid login details'),
            reset: mockSubmitReset,
          },
          getErrorMessage: () => 'Invalid login details',
        }),
      );
      render();
      const emailInput = screen.getByTestId('email-field');

      fireEvent.changeText(emailInput, 'test@example.com');

      expect(mockSubmitReset).toHaveBeenCalled();
    });

    it('resets submit error when user types in password field', () => {
      mockUseCardAuth.mockReturnValue(
        makeDefaultHookReturn({
          submit: {
            mutateAsync: mockSubmitMutateAsync,
            isPending: false,
            error: new Error('Invalid login details'),
            reset: mockSubmitReset,
          },
          getErrorMessage: () => 'Invalid login details',
        }),
      );
      render();
      const passwordInput = screen.getByTestId('password-field');

      fireEvent.changeText(passwordInput, 'password123');

      expect(mockSubmitReset).toHaveBeenCalled();
    });

    it('does not reset error when typing with no existing error', () => {
      render();
      const emailInput = screen.getByTestId('email-field');

      fireEvent.changeText(emailInput, 'test@example.com');

      expect(mockSubmitReset).not.toHaveBeenCalled();
    });
  });

  describe('Login Step - Password Visibility Toggle', () => {
    it('renders the password visibility toggle button', () => {
      render();

      expect(
        screen.getByTestId('password-visibility-toggle'),
      ).toBeOnTheScreen();
    });

    it('has password hidden by default', () => {
      render();

      expect(getLoginTextInput('password-field').props.secureTextEntry).toBe(
        true,
      );
    });

    it('shows password when visibility toggle is pressed', () => {
      render();
      const toggleButton = screen.getByTestId('password-visibility-toggle');

      fireEvent.press(toggleButton);

      expect(getLoginTextInput('password-field').props.secureTextEntry).toBe(
        false,
      );
    });

    it('hides password again when visibility toggle is pressed twice', () => {
      render();
      const toggleButton = screen.getByTestId('password-visibility-toggle');

      fireEvent.press(toggleButton);
      fireEvent.press(toggleButton);

      expect(getLoginTextInput('password-field').props.secureTextEntry).toBe(
        true,
      );
    });
  });

  describe('Login Step - Login Functionality', () => {
    it('calls initiate then submit with correct parameters', async () => {
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
        expect(mockInitiateMutateAsync).toHaveBeenCalledWith('international');
        expect(mockSubmitMutateAsync).toHaveBeenCalledWith({
          type: 'email_password',
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    it('calls initiate with US location when store location is us', async () => {
      render('us');
      const emailInput = screen.getByTestId('email-field');
      const passwordInput = screen.getByTestId('password-field');
      const loginButton = screen.getByTestId(
        CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON,
      );

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(mockInitiateMutateAsync).toHaveBeenCalledWith('us');
      });
    });

    it('does not call setUserLocation on flag press, defers to login', async () => {
      render();
      const usBox = screen.getByTestId('us-location-box');
      const EngineModule = jest.requireMock(
        '../../../../../core/Engine',
      ).default;

      fireEvent.press(usBox);

      expect(
        EngineModule.context.CardController.setUserLocation,
      ).not.toHaveBeenCalled();

      const emailInput = screen.getByTestId('email-field');
      const passwordInput = screen.getByTestId('password-field');
      const loginButton = screen.getByTestId(
        CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON,
      );

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(mockInitiateMutateAsync).toHaveBeenCalledWith('us');
      });
    });

    it('navigates to card home on successful login', async () => {
      mockSubmitMutateAsync.mockResolvedValue({ done: true });
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

    it('navigates root to HOME_TABS on successful login when postAuthRedirect targets a tab', async () => {
      mockRouteParams = {
        postAuthRedirect: {
          screen: Routes.HOME_TABS,
          params: {
            screen: Routes.MONEY.ROOT,
            params: { screen: Routes.MONEY.HOME },
          },
        },
      };
      mockSubmitMutateAsync.mockResolvedValue({ done: true });
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
        expect(mockNavigationServiceNavigate).toHaveBeenCalledWith(
          Routes.HOME_TABS,
          {
            screen: Routes.MONEY.ROOT,
            params: { screen: Routes.MONEY.HOME },
          },
        );
      });
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockNavigationServiceGoBack).not.toHaveBeenCalled();
      expect(mockReset).not.toHaveBeenCalled();
    });

    it('returns to Money tab when login completed from sign-up entry path (CARD-416)', async () => {
      mockRouteParams = {
        postAuthRedirect: {
          screen: Routes.HOME_TABS,
          params: {
            screen: Routes.MONEY.ROOT,
            params: { screen: Routes.MONEY.HOME },
          },
        },
      };
      mockSubmitMutateAsync.mockResolvedValue({ done: true });
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
        expect(mockNavigationServiceNavigate).toHaveBeenCalledWith(
          Routes.HOME_TABS,
          {
            screen: Routes.MONEY.ROOT,
            params: { screen: Routes.MONEY.HOME },
          },
        );
      });
      expect(mockNavigationServiceGoBack).not.toHaveBeenCalled();
    });

    it('dispatches CommonActions.navigate locally for in-flow postAuthRedirect target (e.g. CardHome)', async () => {
      mockRouteParams = {
        postAuthRedirect: {
          screen: Routes.CARD.HOME,
        },
      };
      mockSubmitMutateAsync.mockResolvedValue({ done: true });
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
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'NAVIGATE',
            payload: expect.objectContaining({
              name: Routes.CARD.HOME,
              params: undefined,
            }),
          }),
        );
      });
      expect(mockNavigationServiceNavigate).not.toHaveBeenCalled();
      expect(mockNavigationServiceGoBack).not.toHaveBeenCalled();
      expect(mockReset).not.toHaveBeenCalled();
    });

    it('does not navigate when login error exists', () => {
      mockUseCardAuth.mockReturnValue(
        makeDefaultHookReturn({
          submit: {
            mutateAsync: mockSubmitMutateAsync,
            isPending: false,
            error: new Error('Invalid login details'),
            reset: mockSubmitReset,
          },
          getErrorMessage: () => 'Invalid login details',
        }),
      );

      render();
      const emailInput = screen.getByTestId('email-field');
      const passwordInput = screen.getByTestId('password-field');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      expect(mockReset).not.toHaveBeenCalled();
      expect(screen.getByTestId('login-error-text')).toBeOnTheScreen();
    });

    it('submits form when password field enter key is pressed', async () => {
      mockSubmitMutateAsync.mockResolvedValue({ done: true });

      render();
      const emailInput = screen.getByTestId('email-field');
      const passwordInput = screen.getByTestId('password-field');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent(passwordInput, 'submitEditing');

      await waitFor(() => {
        expect(mockSubmitMutateAsync).toHaveBeenCalledWith({
          type: 'email_password',
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });
  });

  describe('Login Step - Loading State', () => {
    it('shows loading state during login', async () => {
      mockUseCardAuth.mockReturnValue(
        makeDefaultHookReturn({
          initiate: {
            mutateAsync: mockInitiateMutateAsync,
            isPending: true,
            error: null,
            reset: mockInitiateReset,
          },
        }),
      );

      render();
      const loginButton = screen.getByTestId(
        CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON,
      );

      expect(loginButton).toBeDisabled();
      expect(loginButton.props.accessibilityState.busy).toBe(true);
    });
  });

  describe('Login Step - Error Handling', () => {
    it('displays error message when submit error exists', () => {
      mockUseCardAuth.mockReturnValue(
        makeDefaultHookReturn({
          submit: {
            mutateAsync: mockSubmitMutateAsync,
            isPending: false,
            error: new Error('Invalid login details'),
            reset: mockSubmitReset,
          },
          getErrorMessage: () => 'Invalid login details',
        }),
      );

      render();

      expect(screen.getByText('Invalid login details')).toBeOnTheScreen();
    });

    it('does not display error box when no error exists', () => {
      render();

      expect(screen.queryByText('Invalid login details')).not.toBeOnTheScreen();
    });

    it('displays network error message correctly', () => {
      mockUseCardAuth.mockReturnValue(
        makeDefaultHookReturn({
          submit: {
            mutateAsync: mockSubmitMutateAsync,
            isPending: false,
            error: new Error(
              'Network error. Please check your connection and try again.',
            ),
            reset: mockSubmitReset,
          },
          getErrorMessage: () =>
            'Network error. Please check your connection and try again.',
        }),
      );

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

      expect(getLoginTextInput('email-field').props.accessibilityLabel).toBe(
        'Email',
      );
    });

    it('has accessibility labels for password input', () => {
      render();

      expect(getLoginTextInput('password-field').props.accessibilityLabel).toBe(
        'Password',
      );
    });

    it('has email keyboard type for email input', () => {
      render();

      expect(getLoginTextInput('email-field').props.keyboardType).toBe(
        'email-address',
      );
    });

    it('has secure text entry for password input', () => {
      render();

      expect(getLoginTextInput('password-field').props.secureTextEntry).toBe(
        true,
      );
    });

    it('has correct return key types for form navigation', () => {
      render();

      expect(getLoginTextInput('email-field').props.returnKeyType).toBe('next');

      expect(getLoginTextInput('password-field').props.returnKeyType).toBe(
        'done',
      );
    });
  });

  describe('OTP Step - Rendering', () => {
    it('shows OTP input when currentStep is otp', () => {
      mockUseCardAuth.mockReturnValue(
        makeDefaultHookReturn({
          currentStep: { type: 'otp', destination: '+1555****90' },
        }),
      );

      render();

      expect(screen.getByTestId('otp-code-field')).toBeOnTheScreen();
      expect(screen.queryByTestId('email-field')).not.toBeOnTheScreen();
    });

    it('shows masked phone number in description', () => {
      mockUseCardAuth.mockReturnValue(
        makeDefaultHookReturn({
          currentStep: { type: 'otp', destination: '+1555****90' },
        }),
      );

      render();

      expect(
        screen.getByText('We sent a code to +1555****90'),
      ).toBeOnTheScreen();
    });

    it('shows confirm button disabled when fewer than 6 digits entered', () => {
      mockUseCardAuth.mockReturnValue(
        makeDefaultHookReturn({
          currentStep: { type: 'otp', destination: '+1555****90' },
        }),
      );

      render();
      const otpInput = screen.getByTestId('otp-code-field');
      fireEvent.changeText(otpInput, '123');

      const confirmButton = screen.getByTestId('otp-confirm-button');
      expect(confirmButton).toBeDisabled();
    });

    it('shows back to login button', () => {
      mockUseCardAuth.mockReturnValue(
        makeDefaultHookReturn({
          currentStep: { type: 'otp', destination: '+1555****90' },
        }),
      );

      render();

      expect(screen.getByTestId('otp-back-to-login-button')).toBeOnTheScreen();
    });
  });

  describe('OTP Step - Auto-send', () => {
    it('calls stepAction.mutate when step becomes otp', () => {
      mockUseCardAuth.mockReturnValue(
        makeDefaultHookReturn({
          currentStep: { type: 'otp', destination: '+1555****90' },
        }),
      );

      render();

      expect(mockStepActionMutate).toHaveBeenCalledTimes(1);
    });

    it('does not call stepAction.mutate on login step', () => {
      render();

      expect(mockStepActionMutate).not.toHaveBeenCalled();
    });
  });

  describe('OTP Step - Submission', () => {
    it('auto-submits when 6 digits are entered', async () => {
      mockUseCardAuth.mockReturnValue(
        makeDefaultHookReturn({
          currentStep: { type: 'otp', destination: '+1555****90' },
        }),
      );

      render();
      const otpInput = screen.getByTestId('otp-code-field');

      await act(async () => {
        fireEvent.changeText(otpInput, '123456');
      });

      await waitFor(() => {
        expect(mockSubmitMutateAsync).toHaveBeenCalledWith({
          type: 'email_password',
          email: '',
          password: '',
          otpCode: '123456',
        });
      });
    });

    it('does NOT call initiate.mutateAsync on OTP submission', async () => {
      mockUseCardAuth.mockReturnValue(
        makeDefaultHookReturn({
          currentStep: { type: 'otp', destination: '+1555****90' },
        }),
      );

      render();
      const otpInput = screen.getByTestId('otp-code-field');

      await act(async () => {
        fireEvent.changeText(otpInput, '123456');
      });

      await waitFor(() => {
        expect(mockSubmitMutateAsync).toHaveBeenCalled();
      });
      expect(mockInitiateMutateAsync).not.toHaveBeenCalled();
    });

    it('navigates to home after successful OTP login', async () => {
      mockSubmitMutateAsync.mockResolvedValue({ done: true });
      mockUseCardAuth.mockReturnValue(
        makeDefaultHookReturn({
          currentStep: { type: 'otp', destination: '+1555****90' },
        }),
      );

      render();
      const otpInput = screen.getByTestId('otp-code-field');

      await act(async () => {
        fireEvent.changeText(otpInput, '123456');
      });

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledWith({
          index: 0,
          routes: [{ name: Routes.CARD.HOME }],
        });
      });
    });
  });

  describe('OTP Step - Resend', () => {
    it('resend button text shows cooldown when active', () => {
      mockUseCardAuth.mockReturnValue(
        makeDefaultHookReturn({
          currentStep: { type: 'otp', destination: '+1555****90' },
        }),
      );

      render();

      expect(screen.getByText('Resend code in 60 seconds')).toBeOnTheScreen();
    });

    it('calls stepAction.mutate on resend press after cooldown expires', () => {
      mockUseCardAuth.mockReturnValue(
        makeDefaultHookReturn({
          currentStep: { type: 'otp', destination: '+1555****90' },
        }),
      );

      render();

      for (let i = 0; i < 61; i++) {
        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }

      const resendText = screen.getByText('Resend');
      fireEvent.press(resendText);

      expect(mockStepActionMutate).toHaveBeenCalledTimes(2); // 1 from auto-send + 1 from resend
    });
  });

  describe('OTP Step - Onboarding redirect', () => {
    it('dispatches setOnboardingId and navigates to onboarding', async () => {
      mockSubmitMutateAsync.mockResolvedValue({
        done: false,
        onboardingRequired: { sessionId: 'session-123', phase: 'kyc' },
      });
      mockUseCardAuth.mockReturnValue(
        makeDefaultHookReturn({
          currentStep: { type: 'otp', destination: '+1555****90' },
        }),
      );

      render();
      const otpInput = screen.getByTestId('otp-code-field');

      await act(async () => {
        fireEvent.changeText(otpInput, '123456');
      });

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledWith({
          index: 0,
          routes: [
            {
              name: Routes.CARD.ONBOARDING.ROOT,
              params: { cardUserPhase: 'kyc' },
            },
          ],
        });
      });
    });
  });

  describe('Back to Login', () => {
    it('calls resetToLogin on back button press', () => {
      mockUseCardAuth.mockReturnValue(
        makeDefaultHookReturn({
          currentStep: { type: 'otp', destination: '+1555****90' },
        }),
      );

      render();

      const backButton = screen.getByTestId('otp-back-to-login-button');
      fireEvent.press(backButton);

      expect(mockResetToLogin).toHaveBeenCalledTimes(1);
    });

    it('shows login form after resetToLogin is called', () => {
      const { rerender } = render();

      // Simulate hook returning otp step
      mockUseCardAuth.mockReturnValue(
        makeDefaultHookReturn({
          currentStep: { type: 'otp', destination: '+1555****90' },
        }),
      );
      rerender(<CardAuthentication />);

      expect(screen.getByTestId('otp-code-field')).toBeOnTheScreen();

      // Simulate hook returning email_password step after resetToLogin
      mockUseCardAuth.mockReturnValue(makeDefaultHookReturn());
      rerender(<CardAuthentication />);

      expect(screen.getByTestId('email-field')).toBeOnTheScreen();
      expect(screen.queryByTestId('otp-code-field')).not.toBeOnTheScreen();
    });
  });

  describe('Auth Prompt Info Banner', () => {
    it('shows info banner when showAuthPrompt param is true', () => {
      mockRouteParams = { showAuthPrompt: true };
      render();

      expect(screen.getByTestId('card-message-box')).toBeOnTheScreen();
      expect(
        screen.getByText('Log in to your card account to access this feature.'),
      ).toBeOnTheScreen();
    });

    it('does not show info banner when showAuthPrompt param is absent', () => {
      render();

      expect(screen.queryByTestId('card-message-box')).not.toBeOnTheScreen();
    });

    it('does not show info banner on OTP step even with showAuthPrompt param', () => {
      mockRouteParams = { showAuthPrompt: true };
      mockUseCardAuth.mockReturnValue(
        makeDefaultHookReturn({
          currentStep: { type: 'otp', destination: '+1555****90' },
        }),
      );

      render();

      expect(screen.queryByTestId('card-message-box')).not.toBeOnTheScreen();
    });
  });

  describe('Forgot Password', () => {
    it('renders the forgot password link on the login step', () => {
      render();

      expect(
        screen.getByTestId(CardAuthenticationSelectors.FORGOT_PASSWORD_BUTTON),
      ).toBeOnTheScreen();
    });

    it('does not render the forgot password link when the feature flag is disabled', () => {
      mockIsForgotPasswordEnabled = false;

      render();

      expect(
        screen.queryByTestId(
          CardAuthenticationSelectors.FORGOT_PASSWORD_BUTTON,
        ),
      ).not.toBeOnTheScreen();
    });

    it('does not render the forgot password link on the OTP step', () => {
      mockUseCardAuth.mockReturnValue(
        makeDefaultHookReturn({
          currentStep: { type: 'otp', destination: '+1555****90' },
        }),
      );

      render();

      expect(
        screen.queryByTestId(
          CardAuthenticationSelectors.FORGOT_PASSWORD_BUTTON,
        ),
      ).not.toBeOnTheScreen();
    });

    it('navigates to the forgot password modal when pressed', () => {
      render();

      fireEvent.press(
        screen.getByTestId(CardAuthenticationSelectors.FORGOT_PASSWORD_BUTTON),
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.MODALS.ID, {
        screen: Routes.CARD.MODALS.FORGOT_PASSWORD,
        params: { location: 'international' },
      });
    });
  });

  describe('UK / Immersve re-entry', () => {
    it('does not render the UK location box when the flag is disabled', () => {
      mockIsImmersveEnabled = false;

      render();

      expect(
        screen.queryByTestId(CardAuthenticationSelectors.UK_LOCATION_BOX),
      ).not.toBeOnTheScreen();
    });

    it('renders the UK location box when the flag is enabled', () => {
      mockIsImmersveEnabled = true;

      render();

      expect(
        screen.getByTestId(CardAuthenticationSelectors.UK_LOCATION_BOX),
      ).toBeOnTheScreen();
    });

    it('does not render the UK location box on the OTP step', () => {
      mockIsImmersveEnabled = true;
      mockUseCardAuth.mockReturnValue(
        makeDefaultHookReturn({
          currentStep: { type: 'otp', destination: '+1555****90' },
        }),
      );

      render();

      expect(
        screen.queryByTestId(CardAuthenticationSelectors.UK_LOCATION_BOX),
      ).not.toBeOnTheScreen();
    });

    it('hides email/password and shows the account picker when UK is selected', () => {
      mockIsImmersveEnabled = true;

      render();
      fireEvent.press(
        screen.getByTestId(CardAuthenticationSelectors.UK_LOCATION_BOX),
      );

      expect(
        screen.queryByTestId(CardAuthenticationSelectors.EMAIL_FIELD),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(CardAuthenticationSelectors.PASSWORD_FIELD),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          CardAuthenticationSelectors.FORGOT_PASSWORD_BUTTON,
        ),
      ).not.toBeOnTheScreen();
      expect(
        screen.getByTestId(CardAuthenticationSelectors.UK_ACCOUNT_SELECT),
      ).toBeOnTheScreen();
    });

    it('opens the account selector from the account picker', () => {
      mockIsImmersveEnabled = true;

      render();
      fireEvent.press(
        screen.getByTestId(CardAuthenticationSelectors.UK_LOCATION_BOX),
      );
      fireEvent.press(
        screen.getByTestId(CardAuthenticationSelectors.UK_ACCOUNT_SELECT),
      );

      expect(mockNavigate).toHaveBeenCalledWith(
        ...mockAccountSelectorNavDetails,
      );
    });

    it('resumes onboarding via SIWE for the selected account when the button is pressed', async () => {
      mockIsImmersveEnabled = true;
      mockResumeImmersveOnboarding.mockResolvedValue(undefined);

      render();
      fireEvent.press(
        screen.getByTestId(CardAuthenticationSelectors.UK_LOCATION_BOX),
      );
      await act(async () => {
        fireEvent.press(
          screen.getByTestId(CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON),
        );
      });

      expect(mockResumeImmersveOnboarding).toHaveBeenCalledWith({
        country: 'GB',
        address: IMMERSVE_TEST_ADDRESS,
        showAccountExistsToast: false,
        navigateFromRoot: true,
      });
      expect(mockInitiateMutateAsync).not.toHaveBeenCalled();
      expect(mockSubmitMutateAsync).not.toHaveBeenCalled();
    });

    it('surfaces an inline error when resume fails', async () => {
      mockIsImmersveEnabled = true;
      mockResumeImmersveOnboarding.mockRejectedValue(new Error('siwe boom'));

      render();
      fireEvent.press(
        screen.getByTestId(CardAuthenticationSelectors.UK_LOCATION_BOX),
      );
      await act(async () => {
        fireEvent.press(
          screen.getByTestId(CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON),
        );
      });

      expect(
        screen.getByTestId(CardAuthenticationSelectors.UK_LOGIN_ERROR_TEXT),
      ).toBeOnTheScreen();
    });

    it('uses the Baanx email/password flow when UK is not selected', async () => {
      mockIsImmersveEnabled = true;
      mockSubmitMutateAsync.mockResolvedValue({ done: true });

      render();
      fireEvent.changeText(
        getLoginTextInput(CardAuthenticationSelectors.EMAIL_FIELD),
        'user@example.com',
      );
      fireEvent.changeText(
        getLoginTextInput(CardAuthenticationSelectors.PASSWORD_FIELD),
        'password123',
      );
      await act(async () => {
        fireEvent.press(
          screen.getByTestId(CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON),
        );
      });

      expect(mockSubmitMutateAsync).toHaveBeenCalled();
      expect(mockResumeImmersveOnboarding).not.toHaveBeenCalled();
    });
  });
});

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

jest.mock('../../hooks/useCardAuth');

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
      'card.card_otp_authentication.confirm_button': 'Confirm',
      'card.card_otp_authentication.back_to_login_button': 'Back to login',
      'card.card_otp_authentication.confirm_code_label': 'Verification code',
      'card.card_otp_authentication.didnt_receive_code':
        "Didn't receive the code?",
      'card.card_otp_authentication.resend_verification': 'Resend',
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

    it('renders login step', () => {
      render();

      expect(screen.getByText('Log in to your card account')).toBeOnTheScreen();
      expect(screen.getByTestId('email-field')).toBeOnTheScreen();
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
      const passwordInput = screen.getByTestId('password-field');

      expect(passwordInput).toHaveProp('secureTextEntry', true);
    });

    it('shows password when visibility toggle is pressed', () => {
      render();
      const passwordInput = screen.getByTestId('password-field');
      const toggleButton = screen.getByTestId('password-visibility-toggle');

      fireEvent.press(toggleButton);

      expect(passwordInput).toHaveProp('secureTextEntry', false);
    });

    it('hides password again when visibility toggle is pressed twice', () => {
      render();
      const passwordInput = screen.getByTestId('password-field');
      const toggleButton = screen.getByTestId('password-visibility-toggle');

      fireEvent.press(toggleButton);
      fireEvent.press(toggleButton);

      expect(passwordInput).toHaveProp('secureTextEntry', true);
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

    it('calls setUserLocation when pressing US location button', () => {
      render();
      const usBox = screen.getByTestId('us-location-box');
      const Engine = jest.requireMock('../../../../../core/Engine').default;

      fireEvent.press(usBox);

      expect(
        Engine.context.CardController.setUserLocation,
      ).toHaveBeenCalledWith('us');
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
});

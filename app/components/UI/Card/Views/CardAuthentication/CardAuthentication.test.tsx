import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import CardAuthentication from './CardAuthentication';
import Routes from '../../../../../constants/navigation/Routes';
import { CardAuthenticationSelectors } from './CardAuthentication.testIds';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { useCardAuth } from '../../hooks/useCardAuth';
import useCardOAuth2Authentication from '../../hooks/useCardOAuth2Authentication';

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

jest.mock('../../hooks/useCardOAuth2Authentication', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseCardAuth = useCardAuth as jest.MockedFunction<typeof useCardAuth>;
const mockUseCardOAuth2Authentication =
  useCardOAuth2Authentication as jest.MockedFunction<
    typeof useCardOAuth2Authentication
  >;

const mockOAuthLogin = jest.fn();
const mockOAuthClearError = jest.fn();

const mockInitiateMutateAsync = jest.fn();
const mockSubmitMutateAsync = jest.fn();
const mockInitiateReset = jest.fn();
const mockSubmitReset = jest.fn();
const mockGetErrorMessage = jest.fn(
  (err: unknown) => (err as Error)?.message ?? 'Unknown error',
);

function makeDefaultHookReturn(
  overrides: Record<string, unknown> = {},
): ReturnType<typeof useCardAuth> {
  return {
    currentStep: { type: 'oauth2' },
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
    logout: { mutate: jest.fn() } as never,
    resetToLogin: jest.fn(),
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
      'card.card_authentication.location_button_text': 'International',
      'card.card_authentication.location_button_text_us': 'United States',
      'card.card_authentication.login_button': 'Log in',
      'card.card_authentication.signup_button': "I don't have an account",
      'card.card_authentication.errors.invalid_credentials':
        'Invalid login details',
      'card.card_authentication.errors.network_error':
        'Network error. Please check your connection and try again.',
      'card.card_authentication.errors.unknown_error':
        'Unknown error, please try again later',
      'card.card_authentication.auth_prompt_info':
        'Log in to your card account to access this feature.',
      'card.card_authentication.oauth_description':
        'Continue with your MetaMask account to sign in securely.',
      'card.card_authentication.errors.oauth.access_denied':
        'Authentication was denied. Please try again.',
      'card.card_authentication.errors.oauth.temporarily_unavailable':
        'Service temporarily unavailable. Please try again later.',
      'card.card_authentication.errors.oauth.login_required':
        'Please log in to continue.',
      'card.card_authentication.errors.oauth.session_expired':
        'Your session has expired. Please log in again.',
    };
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

describe('CardAuthentication Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};

    mockInitiateMutateAsync.mockResolvedValue(undefined);
    mockSubmitMutateAsync.mockResolvedValue({ done: true });

    mockUseCardAuth.mockReturnValue(makeDefaultHookReturn());

    mockOAuthLogin.mockReset();
    mockOAuthClearError.mockReset();
    mockOAuthLogin.mockResolvedValue({ done: true });
    mockUseCardOAuth2Authentication.mockReturnValue({
      login: mockOAuthLogin,
      loading: false,
      isReady: true,
      error: null,
      clearError: mockOAuthClearError,
    });
  });

  describe('OAuth login step', () => {
    it('renders location picker and log in without email or password fields', () => {
      render();

      expect(screen.getByText('Log in to your card account')).toBeOnTheScreen();
      expect(
        screen.getByText(
          'Continue with your MetaMask account to sign in securely.',
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('international-location-box'),
      ).toBeOnTheScreen();
      expect(screen.getByTestId('us-location-box')).toBeOnTheScreen();
      expect(screen.queryByTestId('email-field')).toBeNull();
      expect(screen.queryByTestId('password-field')).toBeNull();
      expect(
        screen.getByTestId(CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON),
      ).toBeOnTheScreen();
    });

    it('renders signup button', () => {
      render();

      expect(
        screen.getByTestId(CardAuthenticationSelectors.SIGNUP_BUTTON),
      ).toBeOnTheScreen();
    });

    it('runs initiate then oauth login when pressing log in', async () => {
      render();

      fireEvent.press(
        screen.getByTestId(CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON),
      );

      await waitFor(() => {
        expect(mockInitiateMutateAsync).toHaveBeenCalled();
        expect(mockOAuthLogin).toHaveBeenCalled();
      });
    });

    it('clears oauth and mutation state when pressing log in after a prior error', async () => {
      mockUseCardOAuth2Authentication.mockReturnValue({
        login: mockOAuthLogin,
        loading: false,
        isReady: true,
        error: 'OAuth redirect failed',
        clearError: mockOAuthClearError,
      });
      mockUseCardAuth.mockReturnValue(
        makeDefaultHookReturn({
          initiate: {
            mutateAsync: mockInitiateMutateAsync,
            isPending: false,
            error: new Error('prior initiate'),
            reset: mockInitiateReset,
          },
          submit: {
            mutateAsync: mockSubmitMutateAsync,
            isPending: false,
            error: new Error('submit failed'),
            reset: mockSubmitReset,
          },
        } as Record<string, unknown>),
      );

      render();

      fireEvent.press(
        screen.getByTestId(CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON),
      );

      await waitFor(() => {
        expect(mockOAuthClearError).toHaveBeenCalled();
        expect(mockInitiateReset).toHaveBeenCalled();
        expect(mockSubmitReset).toHaveBeenCalled();
        expect(mockInitiateMutateAsync).toHaveBeenCalled();
        expect(mockOAuthLogin).toHaveBeenCalled();
      });
    });

    it('clears oauth errors and resets mutations when changing location', () => {
      render();

      fireEvent.press(screen.getByTestId('us-location-box'));

      expect(mockInitiateReset).toHaveBeenCalled();
      expect(mockSubmitReset).toHaveBeenCalled();
      expect(mockOAuthClearError).toHaveBeenCalled();
    });
  });

  describe('Auth prompt banner', () => {
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
  });
});

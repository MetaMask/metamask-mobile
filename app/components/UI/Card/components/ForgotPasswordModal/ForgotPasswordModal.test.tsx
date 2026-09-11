import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import ForgotPasswordModal from './ForgotPasswordModal';
import { mockTheme } from '../../../../../util/theme';
import { AppThemeKey } from '../../../../../util/theme/models';
import { ToastContext } from '../../../../../component-library/components/Toast';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { getCardWebBaseUrlForMetaMaskEnv } from '../../util/mapCardWebUrl';

// Card web base URL resolver — `process.env.METAMASK_ENVIRONMENT` is inlined at
// transform time, so we mock the resolver to drive the environment per-test.
jest.mock('../../util/mapCardWebUrl', () => ({
  getCardWebBaseUrlForMetaMaskEnv: jest.fn(),
}));

const mockGetCardWebBaseUrl = getCardWebBaseUrlForMetaMaskEnv as jest.Mock;
const PRD_BASE_URL = 'https://card.metamask.io';
const DEV_BASE_URL = 'https://ew2foxdev-card.foxcard.io';

// Navigation
const mockGoBack = jest.fn();
let mockRouteParams: { location?: 'us' | 'international' } | undefined = {};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
  useRoute: () => ({ params: mockRouteParams }),
}));

// Redux — drive the persisted card location selector
let mockPersistedLocation: 'us' | 'international' | null = null;
jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => mockPersistedLocation),
}));
jest.mock('../../../../../selectors/cardController', () => ({
  selectCardUserLocation: jest.fn(),
}));

// Toast
const mockShowToast = jest.fn();
const mockCloseToast = jest.fn();
const mockToastRef = {
  current: { showToast: mockShowToast, closeToast: mockCloseToast },
};

jest.mock('../../../../../component-library/components/Toast', () => {
  const ActualReact = jest.requireActual('react');
  return {
    ToastContext: ActualReact.createContext({ toastRef: undefined }),
    ToastVariants: { Icon: 'Icon' },
  };
});

// Safe area insets
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

// `util/theme` is globally mocked in testSetup so that `useTheme()` returns
// `mockTheme`. We drive the appearance per-test by mutating that shared object.
const setThemeAppearance = (
  themeAppearance: AppThemeKey.light | AppThemeKey.dark,
) => {
  (mockTheme as { themeAppearance: AppThemeKey }).themeAppearance =
    themeAppearance;
};

// Analytics
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => {
  const builder: {
    addProperties: jest.Mock;
    build: jest.Mock;
  } = {
    addProperties: jest.fn(() => builder),
    build: jest.fn(() => ({})),
  };
  return builder;
});

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

// Tailwind
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const tw = () => ({});
    tw.style = jest.fn(() => ({}));
    return tw;
  },
}));

// Design system
jest.mock('@metamask/design-system-react-native', () => {
  const ActualReact = jest.requireActual('react');
  const { Text: RNText, TouchableOpacity } = jest.requireActual('react-native');
  return {
    Text: ({
      children,
      testID,
    }: React.PropsWithChildren<{ testID?: string }>) =>
      ActualReact.createElement(RNText, { testID }, children),
    Button: ({
      children,
      onPress,
      testID,
    }: React.PropsWithChildren<{
      onPress?: () => void;
      testID?: string;
    }>) =>
      ActualReact.createElement(
        TouchableOpacity,
        { onPress, testID },
        children,
      ),
    HeaderStandard: ({
      onBack,
      backButtonProps,
    }: {
      onBack?: () => void;
      backButtonProps?: { testID?: string };
    }) =>
      ActualReact.createElement(
        TouchableOpacity,
        { onPress: onBack, testID: backButtonProps?.testID },
        'Back',
      ),
    ButtonVariant: { Primary: 'Primary' },
    ButtonSize: { Md: 'Md' },
    TextVariant: { BodyMd: 'BodyMd' },
  };
});

// i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

// WebView — captures event handlers so tests can fire them
let mockOnLoadStart: (() => void) | null = null;
let mockOnLoadEnd: (() => void) | null = null;
let mockOnError: (() => void) | null = null;
let mockOnMessage:
  | ((event: { nativeEvent: { data: string; url?: string } }) => void)
  | null = null;
let mockOnNavigationStateChange: ((navState: { url: string }) => void) | null =
  null;
let mockInjectedJavaScript: string | undefined;
let mockSource: { uri?: string } | undefined;

jest.mock('@metamask/react-native-webview', () => {
  const ActualReact = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    WebView: ({
      onLoadStart,
      onLoadEnd,
      onError,
      onMessage,
      onNavigationStateChange,
      injectedJavaScript,
      source,
      testID,
    }: {
      onLoadStart?: () => void;
      onLoadEnd?: () => void;
      onError?: () => void;
      onHttpError?: () => void;
      onMessage?: (event: {
        nativeEvent: { data: string; url?: string };
      }) => void;
      onNavigationStateChange?: (navState: { url: string }) => void;
      injectedJavaScript?: string;
      source?: { uri?: string };
      testID?: string;
    }) => {
      mockOnLoadStart = onLoadStart || null;
      mockOnLoadEnd = onLoadEnd || null;
      mockOnError = onError || null;
      mockOnMessage = onMessage || null;
      mockOnNavigationStateChange = onNavigationStateChange || null;
      mockInjectedJavaScript = injectedJavaScript;
      mockSource = source;
      return ActualReact.createElement(View, { testID });
    },
  };
});

const CARD_LOGIN_URL = 'https://card.metamask.io/account/login';

const renderComponent = () =>
  render(
    <ToastContext.Provider value={{ toastRef: mockToastRef }}>
      <ForgotPasswordModal />
    </ToastContext.Provider>,
  );

describe('ForgotPasswordModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnLoadStart = null;
    mockOnLoadEnd = null;
    mockOnError = null;
    mockOnMessage = null;
    mockOnNavigationStateChange = null;
    mockInjectedJavaScript = undefined;
    mockSource = undefined;
    mockGetCardWebBaseUrl.mockReturnValue(PRD_BASE_URL);
    mockRouteParams = {};
    mockPersistedLocation = null;
    setThemeAppearance(AppThemeKey.light);
  });

  describe('Rendering', () => {
    it('renders the WebView', () => {
      const { getByTestId } = renderComponent();
      expect(getByTestId('forgot-password-webview')).toBeTruthy();
    });

    it('loads the production password reset URL by default', () => {
      renderComponent();
      expect(mockSource?.uri).toBe(
        'https://card.metamask.io/account/password/request',
      );
    });

    it('shows the loading overlay initially', () => {
      const { getByTestId } = renderComponent();
      expect(getByTestId('forgot-password-loading')).toBeTruthy();
    });

    it('renders the back button in the header', () => {
      const { getByTestId } = renderComponent();
      expect(getByTestId('forgot-password-back-button')).toBeTruthy();
    });

    it('applies the top safe-area inset so the header clears the notch', () => {
      const { getByTestId } = renderComponent();

      const container = getByTestId('forgot-password-container');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ paddingTop: 47, paddingBottom: 34 }),
        ]),
      );
    });

    it('tracks a screen viewed analytics event on mount', () => {
      renderComponent();
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('Injected JavaScript (theme + page chrome)', () => {
    it('hides the page back button and theme switcher', () => {
      renderComponent();

      expect(mockInjectedJavaScript).toContain(
        'accountAuthentication__back_button_container',
      );
      expect(mockInjectedJavaScript).toContain(
        'standaloneCardHeader__theme_container',
      );
      expect(mockInjectedJavaScript).toContain('display:none !important');
    });

    it('forces the light theme class when the app theme is light', () => {
      setThemeAppearance(AppThemeKey.light);
      renderComponent();

      expect(mockInjectedJavaScript).toContain("var THEME = 'light'");
      expect(mockInjectedJavaScript).toContain("var OTHER = 'dark'");
    });

    it('forces the dark theme class when the app theme is dark', () => {
      setThemeAppearance(AppThemeKey.dark);
      renderComponent();

      expect(mockInjectedJavaScript).toContain("var THEME = 'dark'");
      expect(mockInjectedJavaScript).toContain("var OTHER = 'light'");
    });

    it('still relays SPA route changes back to the app', () => {
      renderComponent();

      expect(mockInjectedJavaScript).toContain("type: 'card_route'");
    });
  });

  describe('Region (isUsEnv) seeding', () => {
    it('seeds the US cluster when the route location param is "us"', () => {
      mockRouteParams = { location: 'us' };
      renderComponent();

      expect(mockInjectedJavaScript).toContain('var wantUs = true');
      expect(mockInjectedJavaScript).toContain(
        "localStorage.setItem('isUsEnv'",
      );
      expect(mockInjectedJavaScript).toContain('window.location.reload()');
    });

    it('seeds the international cluster when the route location param is "international"', () => {
      mockRouteParams = { location: 'international' };
      renderComponent();

      expect(mockInjectedJavaScript).toContain('var wantUs = false');
    });

    it('falls back to the persisted location when no route param is provided', () => {
      mockRouteParams = {};
      mockPersistedLocation = 'us';
      renderComponent();

      expect(mockInjectedJavaScript).toContain('var wantUs = true');
    });

    it('defaults to international when no route param or persisted location is set', () => {
      mockRouteParams = {};
      mockPersistedLocation = null;
      renderComponent();

      expect(mockInjectedJavaScript).toContain('var wantUs = false');
    });
  });

  describe('Loading', () => {
    it('hides the loading overlay after the WebView finishes loading', () => {
      const { queryByTestId } = renderComponent();
      expect(queryByTestId('forgot-password-loading')).toBeTruthy();

      act(() => {
        mockOnLoadEnd?.();
      });

      expect(queryByTestId('forgot-password-loading')).not.toBeOnTheScreen();
    });

    it('shows the loading overlay again when a new load starts', () => {
      const { queryByTestId } = renderComponent();

      act(() => {
        mockOnLoadEnd?.();
      });
      expect(queryByTestId('forgot-password-loading')).not.toBeOnTheScreen();

      act(() => {
        mockOnLoadStart?.();
      });
      expect(queryByTestId('forgot-password-loading')).toBeTruthy();
    });
  });

  describe('Error state', () => {
    it('shows the error container when the WebView fails to load', () => {
      const { getByTestId, queryByTestId } = renderComponent();

      act(() => {
        mockOnError?.();
      });

      expect(getByTestId('forgot-password-error-container')).toBeTruthy();
      expect(queryByTestId('forgot-password-webview')).not.toBeOnTheScreen();
    });

    it('retry button clears the error and shows the WebView again', () => {
      const { getByTestId, queryByTestId } = renderComponent();

      act(() => {
        mockOnError?.();
      });
      expect(getByTestId('forgot-password-error-container')).toBeTruthy();

      fireEvent.press(getByTestId('forgot-password-retry-button'));

      expect(
        queryByTestId('forgot-password-error-container'),
      ).not.toBeOnTheScreen();
      expect(getByTestId('forgot-password-webview')).toBeTruthy();
    });
  });

  describe('Back button', () => {
    it('calls navigation.goBack() when the back button is pressed', () => {
      const { getByTestId } = renderComponent();

      fireEvent.press(getByTestId('forgot-password-back-button'));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Close on login reached', () => {
    it('closes the modal when navigation reaches the card login URL', () => {
      renderComponent();

      act(() => {
        mockOnNavigationStateChange?.({
          url: 'https://card.metamask.io/account/login',
        });
      });

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('does not close the modal for the reset page URL', () => {
      renderComponent();

      act(() => {
        mockOnNavigationStateChange?.({
          url: 'https://card.metamask.io/account/password/request',
        });
      });

      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('closes the modal when an SPA route message reaches the login path', () => {
      renderComponent();

      act(() => {
        mockOnMessage?.({
          nativeEvent: {
            url: CARD_LOGIN_URL,
            data: JSON.stringify({
              type: 'card_route',
              path: '/account/login',
            }),
          },
        });
      });

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('only closes once when both detection layers fire', () => {
      renderComponent();

      act(() => {
        mockOnNavigationStateChange?.({
          url: 'https://card.metamask.io/account/login',
        });
        mockOnMessage?.({
          nativeEvent: {
            url: CARD_LOGIN_URL,
            data: JSON.stringify({
              type: 'card_route',
              path: '/account/login',
            }),
          },
        });
      });

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('ignores SPA route messages for unrelated paths', () => {
      renderComponent();

      act(() => {
        mockOnMessage?.({
          nativeEvent: {
            url: 'https://card.metamask.io/account/password/request',
            data: JSON.stringify({
              type: 'card_route',
              path: '/account/password/request',
            }),
          },
        });
      });

      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('ignores a forged login message from a non-card origin', () => {
      renderComponent();

      act(() => {
        mockOnMessage?.({
          nativeEvent: {
            url: 'https://evil.example.com/account/login',
            data: JSON.stringify({
              type: 'card_route',
              path: '/account/login',
            }),
          },
        });
      });

      expect(mockGoBack).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('does not throw on non-JSON message data', () => {
      renderComponent();

      expect(() => {
        act(() => {
          mockOnMessage?.({
            nativeEvent: { url: CARD_LOGIN_URL, data: 'not-json' },
          });
        });
      }).not.toThrow();
      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe('Success toast', () => {
    it('shows a success toast when navigation reaches the card login URL', () => {
      renderComponent();

      act(() => {
        mockOnNavigationStateChange?.({
          url: 'https://card.metamask.io/account/login',
        });
      });

      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: [{ label: 'card.card_forgot_password.reset_success' }],
        }),
      );
    });

    it('shows a success toast when an SPA route message reaches the login path', () => {
      renderComponent();

      act(() => {
        mockOnMessage?.({
          nativeEvent: {
            url: CARD_LOGIN_URL,
            data: JSON.stringify({
              type: 'card_route',
              path: '/account/login',
            }),
          },
        });
      });

      expect(mockShowToast).toHaveBeenCalledTimes(1);
    });

    it('does not show a toast when the user closes the WebView with the back button', () => {
      const { getByTestId } = renderComponent();

      fireEvent.press(getByTestId('forgot-password-back-button'));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('shows the success toast only once when both detection layers fire', () => {
      renderComponent();

      act(() => {
        mockOnNavigationStateChange?.({
          url: 'https://card.metamask.io/account/login',
        });
        mockOnMessage?.({
          nativeEvent: {
            url: CARD_LOGIN_URL,
            data: JSON.stringify({
              type: 'card_route',
              path: '/account/login',
            }),
          },
        });
      });

      expect(mockShowToast).toHaveBeenCalledTimes(1);
    });

    it('does not show a toast for the reset page URL', () => {
      renderComponent();

      act(() => {
        mockOnNavigationStateChange?.({
          url: 'https://card.metamask.io/account/password/request',
        });
      });

      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });

  describe('Analytics', () => {
    it('tracks a password reset completed event when the login page is reached', () => {
      renderComponent();

      act(() => {
        mockOnNavigationStateChange?.({
          url: 'https://card.metamask.io/account/login',
        });
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_PASSWORD_RESET_COMPLETED,
      );
    });

    it('does not track a password reset completed event when the user closes the WebView', () => {
      const { getByTestId } = renderComponent();

      fireEvent.press(getByTestId('forgot-password-back-button'));

      expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_PASSWORD_RESET_COMPLETED,
      );
    });
  });

  describe('Environment-specific URLs', () => {
    it('loads the dev password reset URL on the dev environment', () => {
      mockGetCardWebBaseUrl.mockReturnValue(DEV_BASE_URL);
      renderComponent();

      expect(mockSource?.uri).toBe(`${DEV_BASE_URL}/account/password/request`);
    });

    it('closes the modal when navigation reaches the dev login URL', () => {
      mockGetCardWebBaseUrl.mockReturnValue(DEV_BASE_URL);
      renderComponent();

      act(() => {
        mockOnNavigationStateChange?.({
          url: `${DEV_BASE_URL}/account/login`,
        });
      });

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('closes the modal when a dev-origin SPA route message reaches the login path', () => {
      mockGetCardWebBaseUrl.mockReturnValue(DEV_BASE_URL);
      renderComponent();

      act(() => {
        mockOnMessage?.({
          nativeEvent: {
            url: `${DEV_BASE_URL}/account/login`,
            data: JSON.stringify({
              type: 'card_route',
              path: '/account/login',
            }),
          },
        });
      });

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('does not close for a production-origin login message on the dev environment', () => {
      mockGetCardWebBaseUrl.mockReturnValue(DEV_BASE_URL);
      renderComponent();

      act(() => {
        mockOnMessage?.({
          nativeEvent: {
            url: CARD_LOGIN_URL,
            data: JSON.stringify({
              type: 'card_route',
              path: '/account/login',
            }),
          },
        });
      });

      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });
});

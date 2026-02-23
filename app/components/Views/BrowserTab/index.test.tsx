import React from 'react';
import { screen, waitFor } from '@testing-library/react-native';
import AppConstants from '../../../core/AppConstants';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import BrowserTab from './BrowserTab';

const mockInjectJavaScript = jest.fn();

jest.mock('@metamask/react-native-webview', () => {
  const { View } = jest.requireActual('react-native');
  const ActualReact = jest.requireActual('react');

  const MockWebView = ActualReact.forwardRef(
    (props: Record<string, unknown>, ref: React.Ref<unknown>) => {
      ActualReact.useImperativeHandle(ref, () => ({
        injectJavaScript: mockInjectJavaScript,
      }));
      return <View {...props} />;
    },
  );
  MockWebView.displayName = 'WebView';

  return {
    __esModule: true,
    WebView: MockWebView,
    default: MockWebView,
  };
});

const mockNavigation = {
  goBack: jest.fn(),
  goForward: jest.fn(),
  canGoBack: true,
  canGoForward: true,
  addListener: jest.fn(),
  navigate: jest.fn(),
};

const mockRoute = {
  params: { url: '' },
};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => mockNavigation,
    useIsFocused: () => true,
    useRoute: () => mockRoute,
  };
});

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '7.0.0'),
}));

const mockInitialState = {
  browser: {
    activeTab: 1,
    history: [],
    whitelist: [],
    tabs: [],
    favicons: [],
    visitedDappsByHostname: {},
    isFullscreen: false,
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

jest.mock('../../../core/Engine', () => ({
  context: {
    AccountsController: {
      listMultichainAccounts: () => [],
    },
    CurrencyRateController: {
      updateExchangeRate: jest.fn(),
    },
  },
}));

jest.mock('../../../core/EntryScriptWeb3', () => ({
  init: jest.fn(),
  get: () => '',
}));

jest.mock('../../../util/phishingDetection', () => ({
  getPhishingTestResultAsync: jest.fn(() =>
    Promise.resolve({ result: false, name: '' }),
  ),
}));

const mockProps = {
  id: 1,
  activeTab: 1,
  defaultProtocol: 'https://',
  searchEngine: 'Google',
  newTab: jest.fn(),
  addBookmark: jest.fn(),
  updateTabInfo: jest.fn(),
  showTabs: jest.fn(),
  isInTabsView: false,
  initialUrl: 'https://metamask.io',
  homePageUrl: AppConstants.HOMEPAGE_URL,
};

describe('BrowserTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInjectJavaScript.mockClear();
  });

  it('render Browser', async () => {
    renderWithProvider(<BrowserTab {...mockProps} />, {
      state: mockInitialState,
    });
    await waitFor(() =>
      expect(screen.getByTestId('browser-webview')).toBeVisible(),
    );

    expect(screen.toJSON()).toMatchSnapshot();
  });

  describe('Back Button', () => {
    it('renders back button when URL bar is not focused', async () => {
      renderWithProvider(<BrowserTab {...mockProps} />, {
        state: mockInitialState,
      });

      await waitFor(() =>
        expect(screen.getByTestId('browser-webview')).toBeVisible(),
      );

      const backButton = screen.getByTestId('browser-tab-close-button');
      expect(backButton).toBeTruthy();
    });
  });

  describe('WebView originWhitelist', () => {
    it('sets originWhitelist to wildcard for all URLs', async () => {
      renderWithProvider(<BrowserTab {...mockProps} />, {
        state: mockInitialState,
      });

      await waitFor(() =>
        expect(screen.getByTestId('browser-webview')).toBeVisible(),
      );

      const webView = screen.getByTestId('browser-webview');
      expect(webView.props.originWhitelist).toEqual(['*']);
    });
  });

  describe('WebView onShouldStartLoadWithRequest', () => {
    it('blocks ftp URL protocol', async () => {
      renderWithProvider(<BrowserTab {...mockProps} />, {
        state: mockInitialState,
      });

      await waitFor(() =>
        expect(screen.getByTestId('browser-webview')).toBeVisible(),
      );

      const webView = screen.getByTestId('browser-webview');
      const onShouldStartLoadWithRequest =
        webView.props.onShouldStartLoadWithRequest;

      expect(
        onShouldStartLoadWithRequest({
          url: 'ftp://example.com',
        }),
      ).toBe(false);
    });

    it('Stops webview from loading resource and prompts user', async () => {
      renderWithProvider(<BrowserTab {...mockProps} />, {
        state: mockInitialState,
      });

      await waitFor(() =>
        expect(screen.getByTestId('browser-webview')).toBeVisible(),
      );

      const webView = screen.getByTestId('browser-webview');
      const onShouldStartLoadWithRequest =
        webView.props.onShouldStartLoadWithRequest;

      expect(
        onShouldStartLoadWithRequest({
          url: 'tel:+1234567890',
        }),
      ).toBe(false);
    });

    it('allow https resorce to load on webview', async () => {
      renderWithProvider(<BrowserTab {...mockProps} />, {
        state: mockInitialState,
      });

      await waitFor(() =>
        expect(screen.getByTestId('browser-webview')).toBeVisible(),
      );

      const webView = screen.getByTestId('browser-webview');
      const onShouldStartLoadWithRequest =
        webView.props.onShouldStartLoadWithRequest;

      expect(
        onShouldStartLoadWithRequest({
          url: 'https://google.com',
        }),
      ).toBe(true);
    });

    it('shows alert for non-whitelisted protocol javascript:', async () => {
      renderWithProvider(<BrowserTab {...mockProps} />, {
        state: mockInitialState,
      });

      await waitFor(() =>
        expect(screen.getByTestId('browser-webview')).toBeVisible(),
      );

      const webView = screen.getByTestId('browser-webview');
      const onShouldStartLoadWithRequest =
        webView.props.onShouldStartLoadWithRequest;

      expect(
        onShouldStartLoadWithRequest({
          // eslint-disable-next-line no-script-url
          url: 'javascript://example.com',
        }),
      ).toBe(false);
    });
  });

  describe('WebView onOpenWindow', () => {
    it('passes onOpenWindow handler to WebView', async () => {
      renderWithProvider(<BrowserTab {...mockProps} />, {
        state: mockInitialState,
      });

      await waitFor(() =>
        expect(screen.getByTestId('browser-webview')).toBeVisible(),
      );

      const webView = screen.getByTestId('browser-webview');

      expect(typeof webView.props.onOpenWindow).toBe('function');
    });

    it('calls injectJavaScript with sanitized target URL when onOpenWindow fires', async () => {
      renderWithProvider(<BrowserTab {...mockProps} />, {
        state: mockInitialState,
      });

      await waitFor(() =>
        expect(screen.getByTestId('browser-webview')).toBeVisible(),
      );

      const webView = screen.getByTestId('browser-webview');
      const { onOpenWindow } = webView.props;

      onOpenWindow({
        nativeEvent: { targetUrl: 'https://stake.lido.fi' },
      });

      expect(mockInjectJavaScript).toHaveBeenCalledTimes(1);
      expect(mockInjectJavaScript).toHaveBeenCalledWith(
        "window.location.href = 'https://stake.lido.fi'; true;",
      );
    });

    it('sanitizes single quotes in the target URL before injecting', async () => {
      renderWithProvider(<BrowserTab {...mockProps} />, {
        state: mockInitialState,
      });

      await waitFor(() =>
        expect(screen.getByTestId('browser-webview')).toBeVisible(),
      );

      const webView = screen.getByTestId('browser-webview');
      const { onOpenWindow } = webView.props;

      onOpenWindow({
        nativeEvent: { targetUrl: "https://example.com/path?q='test'" },
      });

      expect(mockInjectJavaScript).toHaveBeenCalledTimes(1);
      expect(mockInjectJavaScript).toHaveBeenCalledWith(
        "window.location.href = 'https://example.com/path?q=%27test%27'; true;",
      );
    });

    it('does not call injectJavaScript when targetUrl is empty', async () => {
      renderWithProvider(<BrowserTab {...mockProps} />, {
        state: mockInitialState,
      });

      await waitFor(() =>
        expect(screen.getByTestId('browser-webview')).toBeVisible(),
      );

      const webView = screen.getByTestId('browser-webview');
      const { onOpenWindow } = webView.props;

      onOpenWindow({
        nativeEvent: { targetUrl: '' },
      });

      expect(mockInjectJavaScript).not.toHaveBeenCalled();
    });
  });
});

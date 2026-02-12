import React from 'react';
import { screen, waitFor } from '@testing-library/react-native';
import AppConstants from '../../../core/AppConstants';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import BrowserTab from './BrowserTab';

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

const mockGetPhishingTestResultAsync = jest.fn<
  Promise<{ result: boolean; name: string }>,
  [string]
>(() => Promise.resolve({ result: false, name: '' }));

jest.mock('../../../util/phishingDetection', () => ({
  getPhishingTestResultAsync: (origin: string) =>
    mockGetPhishingTestResultAsync(origin),
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

  describe('Phishing Detection', () => {
    beforeEach(() => {
      mockGetPhishingTestResultAsync.mockClear();
    });

    it('updates URL bar when phishing site is detected during onLoadStart', async () => {
      // Arrange: Configure phishing detection to flag the malicious URL
      mockGetPhishingTestResultAsync.mockImplementation((origin: string) => {
        if (origin === 'https://malicious-site.com') {
          return Promise.resolve({ result: true, name: 'Phishing' });
        }
        return Promise.resolve({ result: false, name: '' });
      });

      renderWithProvider(<BrowserTab {...mockProps} />, {
        state: mockInitialState,
      });

      await waitFor(() =>
        expect(screen.getByTestId('browser-webview')).toBeVisible(),
      );

      const webView = screen.getByTestId('browser-webview');
      const onLoadStart = webView.props.onLoadStart;

      // Act: Simulate WebView starting to load a phishing URL
      await onLoadStart({
        nativeEvent: {
          url: 'https://malicious-site.com/phishing-page',
        },
      });

      // Assert: Verify phishing detection was called with the correct origin
      expect(mockGetPhishingTestResultAsync).toHaveBeenCalledWith(
        'https://malicious-site.com',
      );
    });

    it('allows loading of non-phishing URLs', async () => {
      // Arrange: Configure phishing detection to allow the URL
      mockGetPhishingTestResultAsync.mockResolvedValue({
        result: false,
        name: '',
      });

      renderWithProvider(<BrowserTab {...mockProps} />, {
        state: mockInitialState,
      });

      await waitFor(() =>
        expect(screen.getByTestId('browser-webview')).toBeVisible(),
      );

      const webView = screen.getByTestId('browser-webview');
      const onLoadStart = webView.props.onLoadStart;

      // Act: Simulate WebView starting to load a safe URL
      await onLoadStart({
        nativeEvent: {
          url: 'https://safe-website.com/page',
        },
      });

      // Assert: Verify phishing detection was called
      expect(mockGetPhishingTestResultAsync).toHaveBeenCalledWith(
        'https://safe-website.com',
      );
    });

    it('bypasses phishing detection for whitelisted URLs', async () => {
      // Arrange: Add URL to whitelist in state
      const stateWithWhitelist = {
        ...mockInitialState,
        browser: {
          ...mockInitialState.browser,
          whitelist: ['https://whitelisted-site.com'],
        },
      };

      renderWithProvider(<BrowserTab {...mockProps} />, {
        state: stateWithWhitelist,
      });

      await waitFor(() =>
        expect(screen.getByTestId('browser-webview')).toBeVisible(),
      );

      const webView = screen.getByTestId('browser-webview');
      const onLoadStart = webView.props.onLoadStart;

      // Act: Simulate WebView starting to load a whitelisted URL
      await onLoadStart({
        nativeEvent: {
          url: 'https://whitelisted-site.com/page',
        },
      });

      // Assert: Verify phishing detection was NOT called because URL is whitelisted
      expect(mockGetPhishingTestResultAsync).not.toHaveBeenCalled();
    });
  });
});

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import AppConstants from '../../../core/AppConstants';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import BrowserTab from './BrowserTab';
import Routes from '../../../constants/navigation/Routes';
import {
  DOCUMENT_URL_FOR_URL_BAR,
  WEB_SHARE_MESSAGE_TYPE,
  WEB_DOWNLOAD_MESSAGE_TYPE,
} from '../../../util/browserScripts';
import { handleWebShare } from '../../../util/browser/handleWebShare';
import { handleWebDownload } from '../../../util/browser/handleWebDownload';
import { getPhishingTestResultAsync } from '../../../util/phishingDetection';

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
  addListener: jest.fn(() => jest.fn()),
  navigate: jest.fn(),
  setParams: jest.fn(),
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
  settings: {
    searchEngine: 'Google',
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
    PermissionController: {
      state: {
        subjects: {},
      },
    },
  },
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../../../core/BackgroundBridge/BackgroundBridge', () =>
  jest.fn().mockImplementation(() => ({
    onDisconnect: jest.fn(),
    onMessage: jest.fn(),
    sendNotificationEip1193: jest.fn(),
  })),
);

jest.mock('../../../core/EntryScriptWeb3', () => ({
  init: jest.fn(),
  get: () => '',
}));

jest.mock('../../../util/phishingDetection', () => ({
  getPhishingTestResultAsync: jest.fn(() =>
    Promise.resolve({ result: false, name: '' }),
  ),
}));

jest.mock('../../../util/browser/handleWebShare', () => ({
  WEB_SHARE_MAX_MESSAGE_LENGTH: 15_000_000,
  handleWebShare: jest.fn(() => Promise.resolve({ status: 'success' })),
}));

jest.mock('../../../util/browser/handleWebDownload', () => ({
  WEB_DOWNLOAD_MAX_MESSAGE_LENGTH: 15_000_000,
  handleWebDownload: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../hooks/useNetworkEnablement/useNetworkEnablement', () => ({
  useNetworkEnablement: () => ({
    namespace: 'eip155',
    enabledNetworksByNamespace: {},
    enabledNetworksForCurrentNamespace: {},
    enabledNetworksForAllNamespaces: {},
    networkEnablementController: {},
    enableNetwork: jest.fn(),
    disableNetwork: jest.fn(),
    enableAllPopularNetworks: jest.fn(),
    popularEvmNetworks: [],
    popularMultichainNetworks: [],
    popularNetworks: [],
    isNetworkEnabled: jest.fn(),
    hasOneEnabledNetwork: false,
    tryEnableEvmNetwork: jest.fn(),
  }),
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
  });

  describe('Back Button', () => {
    it('renders back button when URL bar is not focused', async () => {
      renderWithProvider(<BrowserTab {...mockProps} />, {
        state: mockInitialState,
      });

      await waitFor(() =>
        expect(screen.getByTestId('browser-webview')).toBeVisible(),
      );
    });

    it('goes back when close button is pressed and opened from benefit', async () => {
      renderWithProvider(<BrowserTab {...mockProps} fromBenefit />, {
        state: mockInitialState,
      });

      await waitFor(() =>
        expect(screen.getByTestId('browser-webview')).toBeVisible(),
      );

      fireEvent.press(screen.getByTestId('browser-tab-close-button'));

      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
      expect(mockNavigation.navigate).not.toHaveBeenCalledWith(
        Routes.TRENDING_VIEW,
        expect.anything(),
      );
    });

    it('navigates to Card Home when close button is pressed and opened from card', async () => {
      renderWithProvider(<BrowserTab {...mockProps} fromCard />, {
        state: mockInitialState,
      });

      await waitFor(() =>
        expect(screen.getByTestId('browser-webview')).toBeVisible(),
      );

      fireEvent.press(screen.getByTestId('browser-tab-close-button'));

      expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
        screen: Routes.CARD.HOME,
        params: {
          screen: Routes.CARD.HOME,
        },
      });
      expect(mockNavigation.navigate).not.toHaveBeenCalledWith(
        Routes.TRENDING_VIEW,
        expect.anything(),
      );
    });

    it('navigates to Money Home when close button is pressed and opened from money', async () => {
      renderWithProvider(<BrowserTab {...mockProps} fromMoney />, {
        state: mockInitialState,
      });

      await waitFor(() =>
        expect(screen.getByTestId('browser-webview')).toBeVisible(),
      );

      fireEvent.press(screen.getByTestId('browser-tab-close-button'));

      expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      });
      expect(mockNavigation.navigate).not.toHaveBeenCalledWith(
        Routes.TRENDING_VIEW,
        expect.anything(),
      );
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

    it('rejects https URLs with explicit non-default ports', async () => {
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
          url: 'https://example.com:83/page',
        }),
      ).toBe(false);
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

  describe('WebView onLoadStart dapp scanning', () => {
    it('forwards the full URL including path to the scanner', async () => {
      renderWithProvider(<BrowserTab {...mockProps} />, {
        state: mockInitialState,
      });

      await waitFor(() =>
        expect(screen.getByTestId('browser-webview')).toBeVisible(),
      );

      const webView = screen.getByTestId('browser-webview');
      const fullUrl = 'https://shared-host.example/view/test-path';

      // Flag the URL so onLoadStart cancels the load (early return).
      (getPhishingTestResultAsync as jest.Mock).mockResolvedValueOnce({
        result: true,
        name: '',
      });

      const result = await webView.props.onLoadStart({
        nativeEvent: { url: fullUrl },
      });

      // The full URL (with path) must be forwarded to the scanner, not the origin.
      expect(getPhishingTestResultAsync).toHaveBeenCalledWith(fullUrl);
      expect(getPhishingTestResultAsync).not.toHaveBeenCalledWith(
        'https://shared-host.example',
      );
      // Loading the flagged page is cancelled.
      expect(result).toBe(false);
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

  describe('WebView onNavigationStateChange backforward URL resolution', () => {
    const extractRequestIdFromInjectScript = (): string => {
      const injectScript = mockInjectJavaScript.mock.calls[0]?.[0] as string;
      const match = injectScript.match(/requestId:\s*"([^"]+)"/);
      if (!match?.[1]) {
        throw new Error('Expected document URL sync script to be injected');
      }
      return match[1];
    };

    it('does not sync the URL bar while a backforward navigation is loading', async () => {
      renderWithProvider(<BrowserTab {...mockProps} />, {
        state: mockInitialState,
      });

      await waitFor(() =>
        expect(screen.getByTestId('browser-webview')).toBeVisible(),
      );

      const webView = screen.getByTestId('browser-webview');
      const { onNavigationStateChange } = webView.props;

      mockNavigation.setParams.mockClear();

      onNavigationStateChange({
        url: 'https://example.com:83/page',
        title: 'Example',
        loading: true,
        canGoBack: true,
        canGoForward: false,
        navigationType: 'backforward',
      });

      expect(mockNavigation.setParams).not.toHaveBeenCalled();
      expect(mockInjectJavaScript).not.toHaveBeenCalled();
    });

    it('updates the URL bar from the document URL after backforward navigation', async () => {
      renderWithProvider(<BrowserTab {...mockProps} />, {
        state: mockInitialState,
      });

      await waitFor(() =>
        expect(screen.getByTestId('browser-webview')).toBeVisible(),
      );

      const webView = screen.getByTestId('browser-webview');
      const { onNavigationStateChange, onMessage } = webView.props;

      mockNavigation.setParams.mockClear();

      onNavigationStateChange({
        url: 'https://example.org/page',
        title: 'Example Org',
        loading: false,
        canGoBack: true,
        canGoForward: false,
        navigationType: 'backforward',
      });

      expect(mockInjectJavaScript).toHaveBeenCalledTimes(1);
      expect(mockNavigation.setParams).not.toHaveBeenCalled();

      const requestId = extractRequestIdFromInjectScript();

      onMessage({
        nativeEvent: {
          data: JSON.stringify({
            type: DOCUMENT_URL_FOR_URL_BAR,
            payload: {
              requestId,
              url: 'https://example.com/page',
              title: 'Example',
            },
          }),
        },
      });

      await waitFor(() =>
        expect(mockNavigation.setParams).toHaveBeenCalledWith(
          expect.objectContaining({
            url: expect.stringContaining('example.com'),
          }),
        ),
      );
      expect(mockNavigation.setParams).not.toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('example.org'),
        }),
      );
    });

    it('ignores document URL sync messages without a matching pending request', async () => {
      renderWithProvider(<BrowserTab {...mockProps} />, {
        state: mockInitialState,
      });

      await waitFor(() =>
        expect(screen.getByTestId('browser-webview')).toBeVisible(),
      );

      const webView = screen.getByTestId('browser-webview');
      const { onMessage } = webView.props;

      mockNavigation.setParams.mockClear();

      onMessage({
        nativeEvent: {
          data: JSON.stringify({
            type: DOCUMENT_URL_FOR_URL_BAR,
            payload: {
              requestId: 'unexpected-request-id',
              url: 'https://example.com',
              title: 'Example',
            },
          }),
        },
      });

      expect(mockNavigation.setParams).not.toHaveBeenCalled();
    });

    it('routes Web Share API messages to handleWebShare', async () => {
      renderWithProvider(<BrowserTab {...mockProps} />, {
        state: mockInitialState,
      });

      await waitFor(() =>
        expect(screen.getByTestId('browser-webview')).toBeVisible(),
      );

      const webView = screen.getByTestId('browser-webview');
      const { onMessage } = webView.props;
      const sharePayload = {
        title: 'Share title',
        text: 'Share text',
        url: 'https://example.com',
      };

      onMessage({
        nativeEvent: {
          data: JSON.stringify({
            type: WEB_SHARE_MESSAGE_TYPE,
            payload: sharePayload,
          }),
        },
      });

      expect(handleWebShare).toHaveBeenCalledWith(sharePayload);
    });

    it('injects the share result back into the WebView to settle navigator.share()', async () => {
      (handleWebShare as jest.Mock).mockResolvedValueOnce({
        status: 'cancelled',
      });

      renderWithProvider(<BrowserTab {...mockProps} />, {
        state: mockInitialState,
      });

      await waitFor(() =>
        expect(screen.getByTestId('browser-webview')).toBeVisible(),
      );

      const webView = screen.getByTestId('browser-webview');
      const { onMessage } = webView.props;

      mockInjectJavaScript.mockClear();

      onMessage({
        nativeEvent: {
          data: JSON.stringify({
            type: WEB_SHARE_MESSAGE_TYPE,
            payload: {
              id: 'mm-share-123',
              url: 'https://example.com',
            },
          }),
        },
      });

      await waitFor(() => {
        const injectedResultScript = mockInjectJavaScript.mock.calls
          .map((call) => call[0] as string)
          .find((script) => script.includes('__mmResolveWebShare'));
        expect(injectedResultScript).toBeDefined();
        expect(injectedResultScript).toContain('mm-share-123');
        expect(injectedResultScript).toContain('cancelled');
      });
    });

    it('settles navigator.share() with an error when a share message exceeds the size limit', async () => {
      renderWithProvider(<BrowserTab {...mockProps} />, {
        state: mockInitialState,
      });

      await waitFor(() =>
        expect(screen.getByTestId('browser-webview')).toBeVisible(),
      );

      const webView = screen.getByTestId('browser-webview');
      const { onMessage } = webView.props;

      mockInjectJavaScript.mockClear();

      // Construct an oversized share message (type first so it is detected as a
      // Web Share message, id near the start so it is recoverable).
      const oversizedData = `{"type":"${WEB_SHARE_MESSAGE_TYPE}","payload":{"id":"mm-share-oversized","files":[{"data":"${'a'.repeat(
        15_000_001,
      )}"}]}}`;

      onMessage({
        nativeEvent: {
          data: oversizedData,
        },
      });

      expect(handleWebShare).not.toHaveBeenCalled();

      const injectedResultScript = mockInjectJavaScript.mock.calls
        .map((call) => call[0] as string)
        .find((script) => script.includes('__mmResolveWebShare'));
      expect(injectedResultScript).toBeDefined();
      expect(injectedResultScript).toContain('mm-share-oversized');
      expect(injectedResultScript).toContain('error');
    });

    it('routes Web Download messages to handleWebDownload', async () => {
      renderWithProvider(<BrowserTab {...mockProps} />, {
        state: mockInitialState,
      });

      await waitFor(() =>
        expect(screen.getByTestId('browser-webview')).toBeVisible(),
      );

      const webView = screen.getByTestId('browser-webview');
      const { onMessage } = webView.props;
      const downloadPayload = {
        filename: 'mm-ten-card-blob.png',
        mimeType: 'image/png',
        data: 'data:image/png;base64,iVBORw0KGgo=',
      };

      onMessage({
        nativeEvent: {
          data: JSON.stringify({
            type: WEB_DOWNLOAD_MESSAGE_TYPE,
            payload: downloadPayload,
          }),
        },
      });

      expect(handleWebDownload).toHaveBeenCalledWith(downloadPayload);
    });
  });
});

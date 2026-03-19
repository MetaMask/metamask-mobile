import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { waitFor } from '@testing-library/react-native';
import FCMService from '../../util/notifications/services/FCMService';
import NavigationService from '../NavigationService';
import SharedDeeplinkManager, {
  DeeplinkManager,
  rewriteBranchUri,
  isBranchDomainUrl,
  stripBranchDeepviewParams,
  resolveBranchShortLink,
} from './DeeplinkManager';
import type { BranchParams } from './types/deepLinkAnalytics.types';
import { handleDeeplink } from './handlers/legacy/handleDeeplink';
import switchNetwork from '../../util/networks/switchNetwork';
import parseDeeplink from './utils/parseDeeplink';
import handleApproveUrl from './handlers/legacy/handleApproveUrl';
import { store } from '../../store';
import { RootState } from '../../reducers';
import branch from 'react-native-branch';
import AppConstants from '../AppConstants';
import Logger from '../../util/Logger';

jest.mock('./handlers/legacy/handleApproveUrl');
jest.mock('./handlers/legacy/handleEthereumUrl');
jest.mock('./handlers/legacy/handleBrowserUrl');
jest.mock('./handlers/legacy/handleRampUrl');
jest.mock('./utils/parseDeeplink');
jest.mock('../../util/networks/switchNetwork');
jest.mock('./handlers/legacy/handleSwapUrl');
jest.mock('./handlers/legacy/handleCreateAccountUrl');
jest.mock('./handlers/legacy/handlePerpsUrl');
jest.mock('./handlers/legacy/handleRewardsUrl');
jest.mock('./handlers/legacy/handleDeeplink');
jest.mock('./handlers/legacy/handleFastOnboarding');
jest.mock('../../util/notifications/services/FCMService');
jest.mock('../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    log: jest.fn(),
  },
}));
jest.mock('../../store', () => ({
  store: {
    getState: jest.fn(),
  },
}));

// Branch and Linking mocks for DeeplinkManager.start tests
jest.mock('react-native-branch', () => ({
  __esModule: true,
  default: {
    subscribe: jest.fn(),
    getLatestReferringParams: jest.fn(),
  },
}));

const mockNavigation = {
  navigate: jest.fn(),
} as unknown as NavigationProp<ParamListBase>;

const mockStore = store as jest.Mocked<typeof store>;

describe('DeeplinkManager', () => {
  let deeplinkManager: DeeplinkManager;

  beforeEach(() => {
    jest.clearAllMocks();
    DeeplinkManager.resetInstance();
    // Ensure navigation is available before DeeplinkManager is constructed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    NavigationService.navigation = mockNavigation as any;
    deeplinkManager = new DeeplinkManager();
  });

  it('sets, gets, and expires a deeplink correctly', () => {
    const testUrl = 'https://example.com';
    deeplinkManager.setDeeplink(testUrl);
    expect(deeplinkManager.getPendingDeeplink()).toBe(testUrl);

    deeplinkManager.expireDeeplink();
    expect(deeplinkManager.getPendingDeeplink()).toBeNull();
  });

  it('handles network switch correctly', () => {
    const chainId = '1';
    switchNetwork({ switchToChainId: chainId });
    expect(switchNetwork).toHaveBeenCalledWith({
      switchToChainId: chainId,
    });
  });

  it('handles transaction approval correctly', async () => {
    const ethUrl = {
      parameters: {},
      target_address: '0x...',
      chain_id: '1',
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const origin = 'testOrigin';

    await handleApproveUrl({ ethUrl, origin });

    expect(handleApproveUrl).toHaveBeenCalledWith({
      ethUrl,
      origin,
    });
  });

  it('parses deeplinks correctly', () => {
    const url = 'http://example.com';
    const browserCallBack = jest.fn();
    const origin = 'testOrigin';
    const onHandled = jest.fn();

    deeplinkManager.parse(url, {
      browserCallBack,
      origin,
      onHandled,
    });

    expect(parseDeeplink).toHaveBeenCalledWith({
      deeplinkManager,
      url,
      origin,
      browserCallBack,
      onHandled,
    });
  });
});

describe('DeeplinkManager.start() - FCM Push Notification Integration', () => {
  const arrangeMocks = () => {
    const mockOnClickPushNotificationWhenAppClosed = jest.mocked(
      FCMService.onClickPushNotificationWhenAppClosed,
    );
    const mockOnClickPushNotificationWhenAppSuspended = jest.mocked(
      FCMService.onClickPushNotificationWhenAppSuspended,
    );
    const mockHandleDeeplink = jest.mocked(handleDeeplink);

    return {
      mockOnClickPushNotificationWhenAppClosed,
      mockOnClickPushNotificationWhenAppSuspended,
      mockHandleDeeplink,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Push Notification - App Closed', () => {
    const arrangeAct = async (deeplink: string | null) => {
      const mocks = arrangeMocks();
      mocks.mockOnClickPushNotificationWhenAppClosed.mockResolvedValue(
        deeplink,
      );

      DeeplinkManager.start();

      return mocks;
    };

    it('handles deeplink when push notification clicked from closed app', async () => {
      const testDeeplink = 'https://link.metamask.io/perps-asset?symbol=ETH';

      const mocks = await arrangeAct(testDeeplink);

      await waitFor(() => {
        expect(
          mocks.mockOnClickPushNotificationWhenAppClosed,
        ).toHaveBeenCalled();
        expect(mocks.mockHandleDeeplink).toHaveBeenCalledWith({
          uri: testDeeplink,
          source: AppConstants.DEEPLINKS.ORIGIN_PUSH_NOTIFICATION,
        });
      });
    });

    it('does not handle deeplink when no deeplink returned from closed app', async () => {
      const mocks = await arrangeAct(null);

      await waitFor(() => {
        expect(
          mocks.mockOnClickPushNotificationWhenAppClosed,
        ).toHaveBeenCalled();
        expect(mocks.mockHandleDeeplink).not.toHaveBeenCalled();
      });
    });
  });

  describe('Push Notification - App Suspended', () => {
    const arrangeAct = (deeplink?: string) => {
      const mocks = arrangeMocks();

      DeeplinkManager.start();

      // Get the callback that was passed to onClickPushNotificationWhenAppSuspended
      const suspendedCallback =
        mocks.mockOnClickPushNotificationWhenAppSuspended.mock.calls[0][0];

      // Simulate the callback being called
      suspendedCallback(deeplink);

      return mocks;
    };

    it('handles deeplink when push notification clicked from suspended app', () => {
      const testDeeplink = 'https://link.metamask.io/perps-asset?symbol=ETH';

      const mocks = arrangeAct(testDeeplink);

      expect(
        mocks.mockOnClickPushNotificationWhenAppSuspended,
      ).toHaveBeenCalledWith(expect.any(Function));
      expect(mocks.mockHandleDeeplink).toHaveBeenCalledWith({
        uri: testDeeplink,
        source: AppConstants.DEEPLINKS.ORIGIN_PUSH_NOTIFICATION,
      });
    });

    it('does not handle deeplink when no deeplink provided from suspended app', () => {
      const mocks = arrangeAct(undefined);

      expect(
        mocks.mockOnClickPushNotificationWhenAppSuspended,
      ).toHaveBeenCalledWith(expect.any(Function));
      expect(mocks.mockHandleDeeplink).not.toHaveBeenCalled();
    });
  });
});

describe('SharedDeeplinkManager', () => {
  beforeEach(() => {
    const mockedState = {
      settings: { deepLinkModalDisabled: false },
    } as jest.Mocked<RootState>;

    mockStore.getState.mockReturnValue(mockedState);
    DeeplinkManager.resetInstance();
    SharedDeeplinkManager.init();
    jest.clearAllMocks();
  });

  it('returns DeeplinkManager instance from getInstance', () => {
    const instance = SharedDeeplinkManager.getInstance();

    expect(instance).toBeDefined();
    expect(instance).toBeInstanceOf(DeeplinkManager);
  });

  it('calls parse method on the DeeplinkManager instance', () => {
    const instance = SharedDeeplinkManager.getInstance();
    const spyParse = jest.spyOn(instance, 'parse');

    const url = 'http://example.com';
    const args = {
      browserCallBack: jest.fn(),
      origin: 'test-origin',
      onHandled: jest.fn(),
    };

    SharedDeeplinkManager.parse(url, args);

    expect(spyParse).toHaveBeenCalledWith(url, args);
  });

  it('calls setDeeplink method on the DeeplinkManager instance', () => {
    const instance = SharedDeeplinkManager.getInstance();
    const spySetDeeplink = jest.spyOn(instance, 'setDeeplink');

    const url = 'http://example.com';
    SharedDeeplinkManager.setDeeplink(url);

    expect(spySetDeeplink).toHaveBeenCalledWith(url);
  });

  it('calls getPendingDeeplink method on the DeeplinkManager instance', () => {
    const instance = SharedDeeplinkManager.getInstance();
    const spyGetPendingDeeplink = jest.spyOn(instance, 'getPendingDeeplink');

    SharedDeeplinkManager.getPendingDeeplink();

    expect(spyGetPendingDeeplink).toHaveBeenCalled();
  });

  it('calls expireDeeplink method on the DeeplinkManager instance', () => {
    const instance = SharedDeeplinkManager.getInstance();
    const spyExpireDeeplink = jest.spyOn(instance, 'expireDeeplink');

    SharedDeeplinkManager.expireDeeplink();

    expect(spyExpireDeeplink).toHaveBeenCalled();
  });
});

describe('rewriteBranchUri', () => {
  it('rewrites host and path to link.metamask.io and preserves query when +clicked_branch_link and $deeplink_path are set', () => {
    const uri =
      'https://metamask-alternate.app.link/1WkF6GmE40b?amount=100&from=0x';
    const params: BranchParams = {
      '+clicked_branch_link': true,
      $deeplink_path: 'swap',
    };
    expect(rewriteBranchUri(uri, params)).toBe(
      'https://link.metamask.io/swap?amount=100&from=0x',
    );
  });

  it('returns undefined when +clicked_branch_link is false', () => {
    const uri = 'https://metamask.app.link/swap';
    expect(
      rewriteBranchUri(uri, { '+clicked_branch_link': false } as BranchParams),
    ).toBeUndefined();
  });

  it('returns undefined when $deeplink_path is missing', () => {
    const uri = 'https://metamask.app.link/swap';
    expect(
      rewriteBranchUri(uri, { '+clicked_branch_link': true } as BranchParams),
    ).toBeUndefined();
  });

  it('returns undefined when uri is undefined', () => {
    expect(
      rewriteBranchUri(undefined, {
        '+clicked_branch_link': true,
        $deeplink_path: 'swap',
      } as BranchParams),
    ).toBeUndefined();
  });

  it('returns undefined when params is undefined', () => {
    expect(
      rewriteBranchUri('https://metamask.app.link/swap', undefined),
    ).toBeUndefined();
  });
});

describe('DeeplinkManager.start Branch deeplink handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (branch.getLatestReferringParams as jest.Mock).mockResolvedValue({});
  });

  it('calls getLatestReferringParams immediately for cold start deeplink check', async () => {
    (branch.getLatestReferringParams as jest.Mock).mockResolvedValue({});
    DeeplinkManager.start();
    await new Promise((resolve) => setImmediate(resolve));
    expect(branch.getLatestReferringParams).toHaveBeenCalledTimes(1);
  });

  it('does not process cold start deeplink when no rewrite is possible', async () => {
    (branch.getLatestReferringParams as jest.Mock).mockResolvedValue({
      '~referring_link': 'https://metamask-alternate.app.link/abc123',
      '+clicked_branch_link': false,
    });
    DeeplinkManager.start();
    await new Promise((resolve) => setImmediate(resolve));
    expect(handleDeeplink).not.toHaveBeenCalled();
  });

  it('rewrites cold start Branch link using $deeplink_path from getLatestReferringParams', async () => {
    (branch.getLatestReferringParams as jest.Mock).mockResolvedValue({
      '+clicked_branch_link': true,
      $deeplink_path: 'swap',
      '~referring_link':
        'https://metamask-alternate.app.link/1WkF6GmE40b?amount=500',
    });
    DeeplinkManager.start();
    await new Promise((resolve) => setImmediate(resolve));
    expect(handleDeeplink).toHaveBeenCalledWith({
      uri: 'https://link.metamask.io/swap?amount=500',
    });
  });

  it('subscribes to Branch deeplink events', async () => {
    DeeplinkManager.start();
    expect(branch.subscribe).toHaveBeenCalled();
  });

  it('processes deeplink from subscription callback when uri is provided', async () => {
    DeeplinkManager.start();
    expect(branch.subscribe).toHaveBeenCalledWith(expect.any(Function));
    const callback = (branch.subscribe as jest.Mock).mock.calls[0][0];
    const mockUri = 'https://link.metamask.io/home';
    callback({ uri: mockUri });
    await new Promise((resolve) => setImmediate(resolve));
    expect(handleDeeplink).toHaveBeenCalledWith({ uri: mockUri });
  });

  it('rewrites Branch short link to link.metamask.io when +clicked_branch_link and $deeplink_path are present', async () => {
    DeeplinkManager.start();
    const callback = (branch.subscribe as jest.Mock).mock.calls[0][0];

    callback({
      uri: 'https://metamask-alternate.app.link/1WkF6GmE40b?amount=1000000&from=eip155%3A1%2Ferc20%3A0xabc',
      params: {
        '+clicked_branch_link': true,
        $deeplink_path: 'swap',
      },
    });

    await new Promise((resolve) => setImmediate(resolve));
    expect(handleDeeplink).toHaveBeenCalledWith({
      uri: 'https://link.metamask.io/swap?amount=1000000&from=eip155%3A1%2Ferc20%3A0xabc',
    });
  });

  it('does not pass Branch domain URI through when +clicked_branch_link is false and no +non_branch_link', async () => {
    DeeplinkManager.start();
    const callback = (branch.subscribe as jest.Mock).mock.calls[0][0];
    const mockUri = 'https://metamask.app.link/swap?amount=100';

    callback({
      uri: mockUri,
      params: { '+clicked_branch_link': false },
    });

    await new Promise((resolve) => setImmediate(resolve));
    expect(handleDeeplink).not.toHaveBeenCalled();
  });

  it('does not pass Branch domain URI through when $deeplink_path is missing and no +non_branch_link', async () => {
    DeeplinkManager.start();
    const callback = (branch.subscribe as jest.Mock).mock.calls[0][0];
    const mockUri = 'https://metamask.app.link/swap?amount=100';

    callback({
      uri: mockUri,
      params: { '+clicked_branch_link': true },
    });

    await new Promise((resolve) => setImmediate(resolve));
    expect(handleDeeplink).not.toHaveBeenCalled();
  });

  it('strips leading slash from $deeplink_path when rewriting', async () => {
    DeeplinkManager.start();
    const callback = (branch.subscribe as jest.Mock).mock.calls[0][0];

    callback({
      uri: 'https://metamask-alternate.app.link/ABC123',
      params: {
        '+clicked_branch_link': true,
        $deeplink_path: '/swap/token',
      },
    });

    await new Promise((resolve) => setImmediate(resolve));
    expect(handleDeeplink).toHaveBeenCalledWith({
      uri: 'https://link.metamask.io/swap/token',
    });
  });
});

describe('isBranchDomainUrl', () => {
  it('returns true for metamask.app.link URLs', () => {
    expect(isBranchDomainUrl('https://metamask.app.link/abc123')).toBe(true);
  });

  it('returns true for metamask-alternate.app.link URLs', () => {
    expect(
      isBranchDomainUrl('https://metamask-alternate.app.link/abc123'),
    ).toBe(true);
  });

  it('returns false for link.metamask.io URLs', () => {
    expect(isBranchDomainUrl('https://link.metamask.io/swap')).toBe(false);
  });

  it('returns false for link-test.metamask.io URLs', () => {
    expect(isBranchDomainUrl('https://link-test.metamask.io/buy')).toBe(false);
  });

  it('returns false for metamask:// custom scheme', () => {
    expect(isBranchDomainUrl('metamask://swap')).toBe(false);
  });

  it('returns false for invalid URLs', () => {
    expect(isBranchDomainUrl('not-a-url')).toBe(false);
  });
});

describe('DeeplinkManager.start Linking API filters Branch domain URLs', () => {
  let mockGetInitialURL: jest.Mock;
  let mockAddEventListener: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    (branch.getLatestReferringParams as jest.Mock).mockResolvedValue({});

    const { Linking } = jest.requireMock('react-native');
    mockGetInitialURL = Linking.getInitialURL as jest.Mock;
    mockAddEventListener = Linking.addEventListener as jest.Mock;
  });

  it('skips Branch domain URLs from Linking.getInitialURL', async () => {
    mockGetInitialURL.mockResolvedValue('https://metamask.app.link/abc123');

    DeeplinkManager.start();
    await new Promise((resolve) => setImmediate(resolve));

    expect(handleDeeplink).not.toHaveBeenCalled();
  });

  it('processes non-Branch URLs from Linking.getInitialURL', async () => {
    mockGetInitialURL.mockResolvedValue(
      'https://link.metamask.io/swap?from=ETH',
    );

    DeeplinkManager.start();
    await new Promise((resolve) => setImmediate(resolve));

    expect(handleDeeplink).toHaveBeenCalledWith({
      uri: 'https://link.metamask.io/swap?from=ETH',
    });
  });

  it('skips Branch domain URLs from Linking.addEventListener', () => {
    DeeplinkManager.start();

    const urlCallback = mockAddEventListener.mock.calls.find(
      (call: unknown[]) => call[0] === 'url',
    )?.[1];
    expect(urlCallback).toBeDefined();

    urlCallback({ url: 'https://metamask-alternate.app.link/xyz' });
    expect(handleDeeplink).not.toHaveBeenCalled();
  });

  it('processes custom scheme URLs from Linking.addEventListener', () => {
    DeeplinkManager.start();

    const urlCallback = mockAddEventListener.mock.calls.find(
      (call: unknown[]) => call[0] === 'url',
    )?.[1];
    expect(urlCallback).toBeDefined();

    urlCallback({ url: 'metamask://buy' });
    expect(handleDeeplink).toHaveBeenCalledWith({ uri: 'metamask://buy' });
  });
});

describe('stripBranchDeepviewParams', () => {
  it('removes Branch Deepview query params from URL but preserves sig and sig_params', () => {
    const url =
      'https://metamask-alternate.app.link/1WkF6GmE40b?__branch_flow_type=viewapp&__branch_flow_id=123&__branch_mobile_deepview_type=1&sig=abc&sig_params=foo&_referrer=twitter&utm_source=twitter';

    const result = stripBranchDeepviewParams(url);

    expect(result).toBe(
      'https://metamask-alternate.app.link/1WkF6GmE40b?sig=abc&sig_params=foo&utm_source=twitter',
    );
  });

  it('returns URL unchanged when no Deepview params are present', () => {
    const url = 'https://metamask-alternate.app.link/abc?utm_source=slack';

    const result = stripBranchDeepviewParams(url);

    expect(result).toBe(url);
  });

  it('returns original string for invalid URLs', () => {
    const result = stripBranchDeepviewParams('not-a-url');

    expect(result).toBe('not-a-url');
  });
});

describe('resolveBranchShortLink', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns final URL when redirect lands on link.metamask.io', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      url: 'https://link.metamask.io/buy',
      text: jest.fn().mockResolvedValue(''),
    });

    const result = await resolveBranchShortLink(
      'https://metamask-alternate.app.link/abc123',
    );

    expect(result).toBe('https://link.metamask.io/buy');
  });

  it('returns final URL when redirect lands on link-test.metamask.io', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      url: 'https://link-test.metamask.io/swap',
      text: jest.fn().mockResolvedValue(''),
    });

    const result = await resolveBranchShortLink(
      'https://metamask-alternate.app.link/abc123',
    );

    expect(result).toBe('https://link-test.metamask.io/swap');
  });

  it('extracts $deeplink_path from HTML body when redirect does not land on MetaMask host', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      url: 'https://metamask-alternate.app.link/abc123',
      text: jest
        .fn()
        .mockResolvedValue(
          '<script>var data = {"$deeplink_path": "swap"};</script>',
        ),
    });

    const result = await resolveBranchShortLink(
      'https://metamask-alternate.app.link/abc123',
    );

    expect(result).toBe('https://link.metamask.io/swap');
  });

  it('extracts deeplink_path without $ prefix from HTML body', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      url: 'https://metamask-alternate.app.link/abc123',
      text: jest
        .fn()
        .mockResolvedValue(
          '<script>var data = {"deeplink_path": "buy"};</script>',
        ),
    });

    const result = await resolveBranchShortLink(
      'https://metamask-alternate.app.link/abc123',
    );

    expect(result).toBe('https://link.metamask.io/buy');
  });

  it('strips leading slash from extracted deeplink_path', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      url: 'https://metamask-alternate.app.link/abc123',
      text: jest
        .fn()
        .mockResolvedValue('<script>"$deeplink_path": "/perps"</script>'),
    });

    const result = await resolveBranchShortLink(
      'https://metamask-alternate.app.link/abc123',
    );

    expect(result).toBe('https://link.metamask.io/perps');
  });

  it('returns undefined when no deeplink_path found in response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      url: 'https://metamask-alternate.app.link/abc123',
      text: jest.fn().mockResolvedValue('<html><body>No data</body></html>'),
    });

    const result = await resolveBranchShortLink(
      'https://metamask-alternate.app.link/abc123',
    );

    expect(result).toBeUndefined();
  });

  it('returns undefined and logs error when fetch throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const result = await resolveBranchShortLink(
      'https://metamask-alternate.app.link/abc123',
    );

    expect(result).toBeUndefined();
  });

  it('strips Deepview params before fetching', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      url: 'https://link.metamask.io/buy',
      text: jest.fn().mockResolvedValue(''),
    });
    global.fetch = mockFetch;

    await resolveBranchShortLink(
      'https://metamask-alternate.app.link/abc123?__branch_flow_type=viewapp&_referrer=twitter',
    );

    expect(mockFetch).toHaveBeenCalledWith(
      'https://metamask-alternate.app.link/abc123',
      expect.objectContaining({ redirect: 'follow' }),
    );
  });

  it('handles invalid finalUrl gracefully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      url: 'not-a-valid-url',
      text: jest.fn().mockResolvedValue('"$deeplink_path": "swap"'),
    });

    const result = await resolveBranchShortLink(
      'https://metamask-alternate.app.link/abc123',
    );

    expect(result).toBe('https://link.metamask.io/swap');
  });

  it('extracts path from Deepview launch button with null scheme prefix', async () => {
    const deepviewHtml = `<html><body>
      <a class="action" href="nulltrending?_branch_referrer=H4sIAAAA">Launch MetaMask</a>
      <script>window.top.location = validateProtocol("nulltrending?_branch_referrer=H4sIAAAA");</script>
    </body></html>`;
    global.fetch = jest.fn().mockResolvedValue({
      url: 'https://metamask-alternate.app.link/abc123',
      text: jest.fn().mockResolvedValue(deepviewHtml),
    });

    const result = await resolveBranchShortLink(
      'https://metamask-alternate.app.link/abc123',
    );

    expect(result).toBe('https://link.metamask.io/trending');
  });

  it('extracts path from Deepview launch button with metamask:// scheme', async () => {
    const deepviewHtml = `<html><body>
      <a class="action" href="metamask://buy?_branch_referrer=abc">Launch MetaMask</a>
    </body></html>`;
    global.fetch = jest.fn().mockResolvedValue({
      url: 'https://metamask-alternate.app.link/abc123',
      text: jest.fn().mockResolvedValue(deepviewHtml),
    });

    const result = await resolveBranchShortLink(
      'https://metamask-alternate.app.link/abc123',
    );

    expect(result).toBe('https://link.metamask.io/buy');
  });

  it('extracts path from Deepview launch button with full MetaMask URL', async () => {
    const deepviewHtml = `<html><body>
      <a class="action" href="https://link.metamask.io/swap?_branch_referrer=abc">Launch MetaMask</a>
    </body></html>`;
    global.fetch = jest.fn().mockResolvedValue({
      url: 'https://metamask-alternate.app.link/abc123',
      text: jest.fn().mockResolvedValue(deepviewHtml),
    });

    const result = await resolveBranchShortLink(
      'https://metamask-alternate.app.link/abc123',
    );

    expect(result).toBe('https://link.metamask.io/swap');
  });

  it('falls back to window.top.location when no action button found', async () => {
    const deepviewHtml = `<html><body>
      <script>window.top.location = validateProtocol("nullperps?_branch_referrer=H4sI");</script>
    </body></html>`;
    global.fetch = jest.fn().mockResolvedValue({
      url: 'https://metamask-alternate.app.link/abc123',
      text: jest.fn().mockResolvedValue(deepviewHtml),
    });

    const result = await resolveBranchShortLink(
      'https://metamask-alternate.app.link/abc123',
    );

    expect(result).toBe('https://link.metamask.io/perps');
  });
});

describe('DeeplinkManager.start Branch error and +non_branch_link handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (branch.getLatestReferringParams as jest.Mock).mockResolvedValue({});
    const { Linking } = jest.requireMock('react-native');
    (Linking.getInitialURL as jest.Mock).mockResolvedValue(null);
  });

  it('logs error when branch.subscribe receives an error', async () => {
    const mockedLogger = jest.mocked(Logger);
    DeeplinkManager.start();
    const callback = (branch.subscribe as jest.Mock).mock.calls[0][0];

    callback({ error: 'Branch init failed', uri: undefined, params: {} });

    expect(mockedLogger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'Error subscribing to branch.',
    );
  });

  it('resolves +non_branch_link on Branch domain via resolveBranchShortLink in subscribe', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      url: 'https://link.metamask.io/buy',
      text: jest.fn().mockResolvedValue(''),
    });

    DeeplinkManager.start();
    const callback = (branch.subscribe as jest.Mock).mock.calls[0][0];

    callback({
      uri: 'https://metamask-alternate.app.link/1WkF6GmE40b',
      params: {
        '+clicked_branch_link': false,
        '+non_branch_link': 'https://metamask-alternate.app.link/1WkF6GmE40b',
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(handleDeeplink).toHaveBeenCalledWith({
      uri: 'https://link.metamask.io/buy',
    });

    global.fetch = originalFetch;
  });

  it('does not call handleDeeplink when resolveBranchShortLink returns undefined in subscribe', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      url: 'https://metamask-alternate.app.link/1WkF6GmE40b',
      text: jest.fn().mockResolvedValue('<html>no data</html>'),
    });

    DeeplinkManager.start();
    const callback = (branch.subscribe as jest.Mock).mock.calls[0][0];

    callback({
      uri: 'https://metamask-alternate.app.link/1WkF6GmE40b',
      params: {
        '+clicked_branch_link': false,
        '+non_branch_link': 'https://metamask-alternate.app.link/1WkF6GmE40b',
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(handleDeeplink).not.toHaveBeenCalled();

    global.fetch = originalFetch;
  });

  it('resolves +non_branch_link on Branch domain via resolveBranchShortLink on cold start', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      url: 'https://link.metamask.io/swap',
      text: jest.fn().mockResolvedValue(''),
    });

    (branch.getLatestReferringParams as jest.Mock).mockResolvedValue({
      '+clicked_branch_link': false,
      '+non_branch_link': 'https://metamask-alternate.app.link/1WkF6GmE40b',
    });

    DeeplinkManager.start();

    await waitFor(() => {
      expect(handleDeeplink).toHaveBeenCalledWith({
        uri: 'https://link.metamask.io/swap',
      });
    });

    global.fetch = originalFetch;
  });

  it('caches Branch params and clears them when empty', async () => {
    DeeplinkManager.start();
    const instance = DeeplinkManager.getInstance();
    const callback = (branch.subscribe as jest.Mock).mock.calls[0][0];

    await new Promise((resolve) => setImmediate(resolve));

    callback({
      uri: 'https://link.metamask.io/buy',
      params: {
        '+clicked_branch_link': true,
        $deeplink_path: 'buy',
        '~campaign': 'test',
      },
    });

    expect(instance.cachedBranchParams).toBeDefined();
    expect(instance.cachedBranchParams?.['~campaign']).toBe('test');

    callback({
      uri: 'https://link.metamask.io/home',
      params: undefined,
    });

    expect(instance.cachedBranchParams).toBeUndefined();
  });

  it('logs error when getLatestReferringParams throws on cold start', async () => {
    const mockedLogger = jest.mocked(Logger);
    (branch.getLatestReferringParams as jest.Mock).mockRejectedValue(
      new Error('Branch SDK error'),
    );

    DeeplinkManager.start();

    await waitFor(() => {
      expect(mockedLogger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.stringContaining('Error getting Branch deeplink'),
      );
    });
  });
});

describe('rewriteBranchUri error handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns undefined and logs error for malformed URI', () => {
    const mockedLogger = jest.mocked(Logger);

    const result = rewriteBranchUri(':::invalid-url', {
      '+clicked_branch_link': true,
      $deeplink_path: 'swap',
    } as BranchParams);

    expect(result).toBeUndefined();
    expect(mockedLogger.error).toHaveBeenCalledTimes(1);
    const [errorArg, msgArg] = mockedLogger.error.mock.calls[0];
    expect(errorArg).toBeDefined();
    expect(errorArg.message).toBeDefined();
    expect(msgArg).toContain('Error rewriting Branch URI');
  });
});

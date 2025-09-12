import QuickCrypto from 'react-native-quick-crypto';
import { ACTIONS, PROTOCOLS, PREFIXES } from '../../../constants/deeplinks';
import AppConstants from '../../AppConstants';
import SDKConnect from '../../SDKConnect/SDKConnect';
import handleDeeplink from '../../SDKConnect/handlers/handleDeeplink';
import DevLogger from '../../SDKConnect/utils/DevLogger';
import WC2Manager from '../../WalletConnect/WalletConnectV2';
import DeeplinkManager from '../DeeplinkManager';
import extractURLParams from './extractURLParams';
import handleUniversalLink from './handleUniversalLink';
import handleDeepLinkModalDisplay from '../Handlers/handleDeepLinkModalDisplay';
import { DeepLinkModalLinkType } from '../../../components/UI/DeepLinkModal';

jest.mock('../../../core/SDKConnect/handlers/handleDeeplink');
jest.mock('../../../core/AppConstants');
jest.mock('../../../core/SDKConnect/SDKConnect');
jest.mock('../../../core/WalletConnect/WalletConnectV2');
jest.mock('../../../core/NativeModules', () => ({
  Minimizer: {
    goBack: jest.fn(),
  },
}));
jest.mock('../Handlers/handleDeepLinkModalDisplay');
jest.mock('react-native-quick-crypto', () => ({
  webcrypto: {
    subtle: {
      importKey: jest.fn(),
      verify: jest.fn(),
    },
  },
}));

const mockSubtle = QuickCrypto.webcrypto.subtle as jest.Mocked<
  typeof QuickCrypto.webcrypto.subtle
> & {
  verify: jest.Mock<Promise<boolean>>;
};

describe('handleUniversalLinks', () => {
  const mockParse = jest.fn();
  const mockHandleBuyCrypto = jest.fn();
  const mockHandleSellCrypto = jest.fn();
  const mockHandleDepositCash = jest.fn();
  const mockHandleBrowserUrl = jest.fn();
  const mockHandleOpenHome = jest.fn();
  const mockHandleSwap = jest.fn();
  const mockHandleCreateAccount = jest.fn();
  const mockHandlePerps = jest.fn();
  const mockHandlePerpsAsset = jest.fn();
  const mockConnectToChannel = jest.fn();
  const mockGetConnections = jest.fn();
  const mockRevalidateChannel = jest.fn();
  const mockReconnect = jest.fn();
  const mockWC2ManagerConnect = jest.fn();
  const mockBindAndroidSDK = jest.fn();

  const mockHandleDeeplink = handleDeeplink as jest.Mock;
  const mockSDKConnectGetInstance = SDKConnect.getInstance as jest.Mock;
  const mockWC2ManagerGetInstance = WC2Manager.getInstance as jest.Mock;

  const instance = {
    parse: mockParse,
    _handleBuyCrypto: mockHandleBuyCrypto,
    _handleSellCrypto: mockHandleSellCrypto,
    _handleDepositCash: mockHandleDepositCash,
    _handleBrowserUrl: mockHandleBrowserUrl,
    _handleOpenHome: mockHandleOpenHome,
    _handleSwap: mockHandleSwap,
    _handleCreateAccount: mockHandleCreateAccount,
    _handlePerps: mockHandlePerps,
    _handlePerpsAsset: mockHandlePerpsAsset,
  } as unknown as DeeplinkManager;

  const handled = jest.fn();

  let urlObj = {} as ReturnType<typeof extractURLParams>['urlObj'];

  const mockBrowserCallBack = jest.fn();
  let url = '';

  const mockHandleDeepLinkModalDisplay =
    handleDeepLinkModalDisplay as jest.MockedFunction<
      typeof handleDeepLinkModalDisplay
    >;
  // Default mock implementation that resolves with true
  mockHandleDeepLinkModalDisplay.mockImplementation((callbackParams) => {
    if (callbackParams.linkType === 'invalid') {
      callbackParams.onBack();
    } else {
      callbackParams.onContinue();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockBindAndroidSDK.mockResolvedValue(undefined);
    mockHandleDeeplink.mockResolvedValue(undefined);

    mockSDKConnectGetInstance.mockImplementation(() => ({
      getConnections: mockGetConnections,
      connectToChannel: mockConnectToChannel,
      revalidateChannel: mockRevalidateChannel,
      reconnect: mockReconnect,
      bindAndroidSDK: mockBindAndroidSDK,
    }));

    mockWC2ManagerGetInstance.mockResolvedValue({
      connect: mockWC2ManagerConnect,
    });

    url = 'https://metamask.app.link';
  });

  describe('ACTIONS.BUY_CRYPTO', () => {
    it('calls instance._handleBuyCrypto if action is ACTIONS.BUY_CRYPTO', async () => {
      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.BUY_CRYPTO}/additional/path`,
        href: 'test-href',
      } as ReturnType<typeof extractURLParams>['urlObj'];

      url = `https://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.BUY_CRYPTO}/additional/path/additional/path`;

      await handleUniversalLink({
        instance,
        handled,
        urlObj,
        browserCallBack: mockBrowserCallBack,
        url,
        source: 'test-source',
      });

      expect(handled).toHaveBeenCalled();
      expect(mockHandleBuyCrypto).toHaveBeenCalledTimes(1);
    });
  });

  describe('ACTIONS.SELL_CRYPTO', () => {
    it('calls instance._handleSellCrypto if action is ACTIONS.SELL_CRYPTO', async () => {
      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.SELL_CRYPTO}/additional/path`,
        href: 'test-href',
      } as ReturnType<typeof extractURLParams>['urlObj'];

      url = `https://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.SELL_CRYPTO}/additional/path/additional/path`;

      await handleUniversalLink({
        instance,
        handled,
        urlObj,
        browserCallBack: mockBrowserCallBack,
        url,
        source: 'test-source',
      });

      expect(handled).toHaveBeenCalled();
      expect(mockHandleSellCrypto).toHaveBeenCalledTimes(1);
    });
  });

  describe('ACTIONS.DEPOSIT', () => {
    it('calls instance._handleDepositCash if action is ACTIONS.DEPOSIT', async () => {
      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.DEPOSIT}/additional/path`,
        href: 'test-href',
      } as ReturnType<typeof extractURLParams>['urlObj'];
      url = `https://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.DEPOSIT}/additional/path/additional/path`;

      await handleUniversalLink({
        instance,
        handled,
        urlObj,
        browserCallBack: mockBrowserCallBack,
        url,
        source: 'test-source',
      });
      expect(handled).toHaveBeenCalled();
      expect(mockHandleDepositCash).toHaveBeenCalledTimes(1);
    });
  });

  describe('MM_IO_UNIVERSAL_LINK_HOST actions', () => {
    beforeEach(() => {
      urlObj = {
        hostname: AppConstants.MM_IO_UNIVERSAL_LINK_HOST,
        href: 'test-href',
      } as ReturnType<typeof extractURLParams>['urlObj'];
    });

    describe('ACTIONS.HOME', () => {
      it('calls _handleOpenHome when action is HOME', async () => {
        const homeUrlObj = {
          ...urlObj,
          pathname: `/${ACTIONS.HOME}/additional/path`,
        };
        url = `https://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${ACTIONS.HOME}/additional/path`;
        await handleUniversalLink({
          instance,
          handled,
          urlObj: homeUrlObj,
          browserCallBack: mockBrowserCallBack,
          url,
          source: 'test-source',
        });

        expect(handled).toHaveBeenCalled();
        expect(mockHandleOpenHome).toHaveBeenCalledTimes(1);
      });
    });

    describe('ACTIONS.SWAP', () => {
      it('calls _handleSwap with correct path of "swap" when action is SWAP', async () => {
        const swapUrl = `${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${ACTIONS.SWAP}/some-swap-path`;
        const swapUrlObj = {
          ...urlObj,
          href: swapUrl,
          pathname: `/${ACTIONS.SWAP}/some-swap-path`,
        };
        url = `https://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${ACTIONS.SWAP}/some-swap-path`;

        await handleUniversalLink({
          instance,
          handled,
          urlObj: swapUrlObj,
          browserCallBack: mockBrowserCallBack,
          url,
          source: 'test-source',
        });

        expect(handled).toHaveBeenCalled();
        expect(mockHandleSwap).toHaveBeenCalledWith(
          `${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${ACTIONS.SWAP}/some-swap-path`,
        );
      });
    });

    describe('ACTIONS.BUY and ACTIONS.BUY_CRYPTO', () => {
      it('calls _handleBuyCrypto with correct path of "buy" when action is BUY', async () => {
        const buyUrl = `${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.BUY}/some-buy-path`;
        const buyUrlObj = {
          ...urlObj,
          href: buyUrl,
          pathname: `/${ACTIONS.BUY}/some-buy-path`,
        };
        url = `https://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.BUY}/some-buy-path`;

        await handleUniversalLink({
          instance,
          handled,
          urlObj: buyUrlObj,
          browserCallBack: mockBrowserCallBack,
          url,
          source: 'test-source',
        });

        expect(handled).toHaveBeenCalled();
        expect(mockHandleBuyCrypto).toHaveBeenCalledWith(
          `${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.BUY}/some-buy-path`,
        );
      });

      it('calls _handleBuyCrypto with correct path of "buy-crypto" when action is BUY_CRYPTO', async () => {
        const buyUrl = `${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.BUY_CRYPTO}/some-buy-path`;
        const buyUrlObj = {
          ...urlObj,
          href: buyUrl,
          pathname: `/${ACTIONS.BUY_CRYPTO}/some-buy-path`,
        };
        url = `https://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.BUY_CRYPTO}/some-buy-path`;

        await handleUniversalLink({
          instance,
          handled,
          urlObj: buyUrlObj,
          browserCallBack: mockBrowserCallBack,
          url,
          source: 'test-source',
        });

        expect(handled).toHaveBeenCalled();
        expect(mockHandleBuyCrypto).toHaveBeenCalledWith(
          `${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.BUY_CRYPTO}/some-buy-path`,
        );
      });
    });

    describe('ACTIONS.SEND', () => {
      const testCases = [
        {
          domain: AppConstants.MM_UNIVERSAL_LINK_HOST,
          description: 'old deeplink domain',
        },
        {
          domain: AppConstants.MM_IO_UNIVERSAL_LINK_HOST,
          description: 'new deeplink domain',
        },
        {
          domain: AppConstants.MM_IO_UNIVERSAL_LINK_TEST_HOST,
          description: 'test deeplink domain',
        },
      ] as const;

      it.each(testCases)(
        'calls parse with new deeplinkUrl with $description',
        async ({ domain }) => {
          const sendUrl = `${PROTOCOLS.HTTPS}://${domain}/${ACTIONS.SEND}/send-path`;
          const origin = `${PROTOCOLS.HTTPS}://${domain}`;
          const sendUrlObj = {
            ...urlObj,
            hostname: domain,
            href: sendUrl,
            pathname: `/${ACTIONS.SEND}/send-path`,
            origin,
          };
          const newSendUrl = `${PREFIXES[ACTIONS.SEND]}send-path`;

          await handleUniversalLink({
            instance,
            handled,
            urlObj: sendUrlObj,
            browserCallBack: mockBrowserCallBack,
            url: sendUrl,
            source: 'test-source',
          });

          expect(handled).toHaveBeenCalled();
          expect(mockParse).toHaveBeenCalledWith(newSendUrl, {
            origin: 'test-source',
          });
        },
      );

      it.each(testCases)(
        'handles send URL without trailing slash with query parameters for $description',
        async ({ domain }) => {
          const sendUrl = `${PROTOCOLS.HTTPS}://${domain}/${ACTIONS.SEND}?value=123&to=0x123`;
          const origin = `${PROTOCOLS.HTTPS}://${domain}`;
          const sendUrlObj = {
            ...urlObj,
            hostname: domain,
            href: sendUrl,
            pathname: `/${ACTIONS.SEND}`,
            origin,
          };
          const newSendUrl = `${PREFIXES[ACTIONS.SEND]}?value=123&to=0x123`;

          await handleUniversalLink({
            instance,
            handled,
            urlObj: sendUrlObj,
            browserCallBack: mockBrowserCallBack,
            url: sendUrl,
            source: 'test-source',
          });

          expect(handled).toHaveBeenCalled();
          expect(mockParse).toHaveBeenCalledWith(newSendUrl, {
            origin: 'test-source',
          });
        },
      );
    });
  });

  describe('ACTIONS.DAPP', () => {
    const testCases = [
      {
        domain: AppConstants.MM_UNIVERSAL_LINK_HOST,
        description: 'old deeplink domain',
      },
      {
        domain: AppConstants.MM_IO_UNIVERSAL_LINK_HOST,
        description: 'new deeplink domain',
      },
      {
        domain: AppConstants.MM_IO_UNIVERSAL_LINK_TEST_HOST,
        description: 'test deeplink domain',
      },
    ] as const;

    it.each(testCases)(
      'calls _handleBrowserUrl with transformed URL for $description',
      async ({ domain }) => {
        const dappUrl = `${PROTOCOLS.HTTPS}://${domain}/${ACTIONS.DAPP}/example.com/path?param=value`;
        const origin = `${PROTOCOLS.HTTPS}://${domain}`;
        const dappUrlObj = {
          ...urlObj,
          hostname: domain,
          href: dappUrl,
          pathname: `/${ACTIONS.DAPP}/example.com/path`,
          origin,
        };
        const expectedTransformedUrl = 'https://example.com/path?param=value';

        await handleUniversalLink({
          instance,
          handled,
          urlObj: dappUrlObj,
          browserCallBack: mockBrowserCallBack,
          url: dappUrl,
          source: 'test-source',
        });

        expect(handled).toHaveBeenCalled();
        expect(mockHandleBrowserUrl).toHaveBeenCalledWith(
          expectedTransformedUrl,
          mockBrowserCallBack,
        );
      },
    );
  });

  describe('ACTIONS.CREATE_ACCOUNT', () => {
    it('calls _handleCreateAccount when action is CREATE_ACCOUNT', async () => {
      const createAccountUrl = `${PROTOCOLS.HTTPS}://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.CREATE_ACCOUNT}/some-account-path`;
      const createAccountUrlObj = {
        ...urlObj,
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        href: createAccountUrl,
        pathname: `/${ACTIONS.CREATE_ACCOUNT}/some-account-path`,
      };

      await handleUniversalLink({
        instance,
        handled,
        urlObj: createAccountUrlObj,
        browserCallBack: mockBrowserCallBack,
        url: createAccountUrl,
        source: 'test-source',
      });

      expect(handled).toHaveBeenCalled();
      expect(mockHandleCreateAccount).toHaveBeenCalledWith(
        '/some-account-path',
      );
    });
  });

  describe('ACTIONS.PERPS', () => {
    it('calls _handlePerps when action is PERPS', async () => {
      const perpsUrl = `${PROTOCOLS.HTTPS}://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.PERPS}/markets`;
      const perpsUrlObj = {
        ...urlObj,
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        href: perpsUrl,
        pathname: `/${ACTIONS.PERPS}/markets`,
      };

      await handleUniversalLink({
        instance,
        handled,
        urlObj: perpsUrlObj,
        browserCallBack: mockBrowserCallBack,
        url: perpsUrl,
        source: 'test-source',
      });

      expect(handled).toHaveBeenCalled();
      expect(mockHandlePerps).toHaveBeenCalledWith('/markets');
    });

    it('calls _handlePerps when action is PERPS_MARKETS', async () => {
      const perpsMarketsUrl = `${PROTOCOLS.HTTPS}://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.PERPS_MARKETS}`;
      const perpsMarketsUrlObj = {
        ...urlObj,
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        href: perpsMarketsUrl,
        pathname: `/${ACTIONS.PERPS_MARKETS}`,
      };

      await handleUniversalLink({
        instance,
        handled,
        urlObj: perpsMarketsUrlObj,
        browserCallBack: mockBrowserCallBack,
        url: perpsMarketsUrl,
        source: 'test-source',
      });

      expect(handled).toHaveBeenCalled();
      expect(mockHandlePerps).toHaveBeenCalledWith('');
    });
  });

  describe('ACTIONS.PERPS_ASSET', () => {
    it('calls _handlePerpsAsset when action is PERPS_ASSET', async () => {
      const perpsAssetUrl = `${PROTOCOLS.HTTPS}://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.PERPS_ASSET}/BTC`;
      const perpsAssetUrlObj = {
        ...urlObj,
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        href: perpsAssetUrl,
        pathname: `/${ACTIONS.PERPS_ASSET}/BTC`,
      };

      await handleUniversalLink({
        instance,
        handled,
        urlObj: perpsAssetUrlObj,
        browserCallBack: mockBrowserCallBack,
        url: perpsAssetUrl,
        source: 'test-source',
      });

      expect(handled).toHaveBeenCalled();
      expect(mockHandlePerpsAsset).toHaveBeenCalledWith('/BTC');
    });
  });

  describe('ACTIONS.WC', () => {
    const testCases = [
      {
        domain: AppConstants.MM_UNIVERSAL_LINK_HOST,
        description: 'old deeplink domain',
      },
      {
        domain: AppConstants.MM_IO_UNIVERSAL_LINK_HOST,
        description: 'new deeplink domain',
      },
      {
        domain: AppConstants.MM_IO_UNIVERSAL_LINK_TEST_HOST,
        description: 'test deeplink domain',
      },
    ] as const;

    it.each(testCases)(
      'calls parse with wc uri param for $description',
      async ({ domain }) => {
        const wcUri = 'wc:abc123@2?relay-protocol=irn&symKey=xyz';
        const encodedWcUri = encodeURIComponent(wcUri);
        const wcUrl = `${PROTOCOLS.HTTPS}://${domain}/${ACTIONS.WC}?uri=${encodedWcUri}`;
        const wcUrlObj = {
          ...urlObj,
          hostname: domain,
          href: wcUrl,
          pathname: `/${ACTIONS.WC}`,
        };

        await handleUniversalLink({
          instance,
          handled,
          urlObj: wcUrlObj,
          browserCallBack: mockBrowserCallBack,
          url: wcUrl,
          source: 'test-source',
        });

        expect(handled).toHaveBeenCalled();
        expect(mockParse).toHaveBeenCalledWith(wcUri, {
          origin: 'test-source',
        });
      },
    );

    it.each(testCases)(
      'does not call parse when wc uri param is missing for $description',
      async ({ domain }) => {
        const wcUrl = `${PROTOCOLS.HTTPS}://${domain}/${ACTIONS.WC}`;
        const wcUrlObj = {
          ...urlObj,
          hostname: domain,
          href: wcUrl,
          pathname: `/${ACTIONS.WC}`,
        } as ReturnType<typeof extractURLParams>['urlObj'];

        await handleUniversalLink({
          instance,
          handled,
          urlObj: wcUrlObj,
          browserCallBack: mockBrowserCallBack,
          url: wcUrl,
          source: 'test-source',
        });

        expect(handled).toHaveBeenCalled();
        expect(mockParse).not.toHaveBeenCalled();
      },
    );
  });

  describe('signature verification', () => {
    beforeEach(() => {
      DevLogger.log = jest.fn();
      mockSubtle.verify.mockResolvedValue(true);
    });

    it('should correctly identify a valid signature and call handleDeepLinkModalDisplay with correct params', async () => {
      const validSignature = Buffer.from(new Array(64).fill(0)).toString(
        'base64',
      );
      url = `https://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.DAPP}?param1=value1&sig=${validSignature}`;

      await handleUniversalLink({
        instance,
        handled,
        urlObj,
        browserCallBack: mockBrowserCallBack,
        url,
        source: 'test-source',
      });

      expect(DevLogger.log).toHaveBeenCalledWith(
        'DeepLinkManager:parse Verified signature for deeplink',
        url,
      );
      expect(mockHandleDeepLinkModalDisplay).toHaveBeenCalledWith({
        linkType: DeepLinkModalLinkType.PRIVATE,
        pageTitle: 'Dapp',
        onContinue: expect.any(Function),
        onBack: expect.any(Function),
      });
      expect(handled).toHaveBeenCalled();
    });

    it('should correctly identify an invalid signature', async () => {
      url = `https://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${ACTIONS.DAPP}?param1=value1&sig=invalidSignature`;

      await handleUniversalLink({
        instance,
        handled,
        urlObj,
        browserCallBack: mockBrowserCallBack,
        url,
        source: 'test-source',
      });

      expect(DevLogger.log).toHaveBeenCalledWith(
        'DeepLinkManager:parse Invalid/Missing signature, ignoring deeplink',
        url,
      );
      expect(mockHandleDeepLinkModalDisplay).toHaveBeenCalledWith({
        linkType: DeepLinkModalLinkType.PUBLIC,
        pageTitle: 'Dapp',
        onContinue: expect.any(Function),
        onBack: expect.any(Function),
      });
      expect(handled).toHaveBeenCalled();
    });

    it('should correctly identify a link with missing signature', async () => {
      url = `https://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${ACTIONS.DAPP}?param1=value1&sig=`;

      await handleUniversalLink({
        instance,
        handled,
        urlObj,
        browserCallBack: mockBrowserCallBack,
        url,
        source: 'test-source',
      });

      expect(DevLogger.log).toHaveBeenCalledWith(
        'DeepLinkManager:parse Invalid/Missing signature, ignoring deeplink',
        url,
      );
      expect(mockHandleDeepLinkModalDisplay).toHaveBeenCalledWith({
        linkType: DeepLinkModalLinkType.PUBLIC,
        pageTitle: 'Dapp',
        onContinue: expect.any(Function),
        onBack: expect.any(Function),
      });
      expect(handled).toHaveBeenCalled();
    });

    it('should correctly identify a public link without signature', async () => {
      url = `https://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${ACTIONS.DAPP}`;

      await handleUniversalLink({
        instance,
        handled,
        urlObj,
        browserCallBack: mockBrowserCallBack,
        url,
        source: 'test-source',
      });

      expect(DevLogger.log).not.toHaveBeenCalled();
      expect(mockHandleDeepLinkModalDisplay).toHaveBeenCalledWith({
        linkType: DeepLinkModalLinkType.PUBLIC,
        pageTitle: 'Dapp',
        onContinue: expect.any(Function),
        onBack: expect.any(Function),
      });
      expect(handled).toHaveBeenCalled();
    });
  });

  describe('interstitial whitelist', () => {
    const whitelistedUrls = [
      'https://link.metamask.io/perps-asset?symbol=ETH',
    ] as const;

    it.each(whitelistedUrls)(
      'skips interstitial modal for whitelisted URL: %s',
      async (testUrl) => {
        const parsedUrl = new URL(testUrl);
        const testUrlObj = {
          ...urlObj,
          hostname: parsedUrl.hostname,
          href: testUrl,
          pathname: parsedUrl.pathname,
        };

        await handleUniversalLink({
          instance,
          handled,
          urlObj: testUrlObj,
          browserCallBack: mockBrowserCallBack,
          url: testUrl,
          source: 'test-source',
        });

        expect(mockHandleDeepLinkModalDisplay).not.toHaveBeenCalled();
        expect(handled).toHaveBeenCalled();
        expect(mockHandlePerpsAsset).toHaveBeenCalled();
      },
    );

    it('shows interstitial modal for non-whitelisted URLs', async () => {
      const nonWhitelistedUrl = `${PROTOCOLS.HTTPS}://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${ACTIONS.DAPP}/example.com`;
      const nonWhitelistedUrlObj = {
        ...urlObj,
        hostname: AppConstants.MM_IO_UNIVERSAL_LINK_HOST,
        href: nonWhitelistedUrl,
        pathname: `/${ACTIONS.DAPP}/example.com`,
      };

      await handleUniversalLink({
        instance,
        handled,
        urlObj: nonWhitelistedUrlObj,
        browserCallBack: mockBrowserCallBack,
        url: nonWhitelistedUrl,
        source: 'test-source',
      });

      expect(mockHandleDeepLinkModalDisplay).toHaveBeenCalledWith({
        linkType: DeepLinkModalLinkType.PUBLIC,
        pageTitle: 'Dapp',
        onContinue: expect.any(Function),
        onBack: expect.any(Function),
      });
      expect(handled).toHaveBeenCalled();
    });
  });
});

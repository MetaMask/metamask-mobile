import QuickCrypto from 'react-native-quick-crypto';
import {
  ACTIONS,
  PROTOCOLS,
  PREFIXES,
} from '../../../../../constants/deeplinks';
import AppConstants from '../../../../AppConstants';
import SDKConnect from '../../../../SDKConnect/SDKConnect';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';
import WC2Manager from '../../../../WalletConnect/WalletConnectV2';
import { DeeplinkManager } from '../../../DeeplinkManager';
import extractURLParams from '../../../utils/extractURLParams';
import handleUniversalLink from '../handleUniversalLink';
import handleDeepLinkModalDisplay from '../handleDeepLinkModalDisplay';
import { DeepLinkModalLinkType } from '../../../../../components/UI/DeepLinkModal';
import handleMetaMaskDeeplink from '../handleMetaMaskDeeplink';
// eslint-disable-next-line import/no-namespace
import * as signatureUtils from '../../../utils/verifySignature';

jest.mock('../handleMetaMaskDeeplink');
jest.mock('../../../../SDKConnect/handlers/handleDeeplink');
jest.mock('../../../../AppConstants');
jest.mock('../../../../SDKConnect/SDKConnect');
jest.mock('../../../../WalletConnect/WalletConnectV2');
jest.mock('../../../../NativeModules', () => ({
  Minimizer: {
    goBack: jest.fn(),
  },
}));
jest.mock('../handleDeepLinkModalDisplay');
jest.mock('../handleRampUrl');
jest.mock('../handleDepositCashUrl');
jest.mock('../handleHomeUrl');
jest.mock('../handleSwapUrl');
jest.mock('../handleBrowserUrl');
jest.mock('../handleCreateAccountUrl');
jest.mock('../handlePerpsUrl');
jest.mock('../handleRewardsUrl');
jest.mock('../handlePredictUrl');
jest.mock('../handleFastOnboarding');
jest.mock('../handleEnableCardButton');
jest.mock('../handleTrendingUrl');
jest.mock('../../../../redux', () => ({
  __esModule: true,
  default: {
    store: {
      getState: jest.fn(() => ({
        settings: {
          deepLinkModalDisabled: false,
        },
      })),
      dispatch: jest.fn(),
    },
  },
}));
jest.mock('react-native-quick-crypto', () => ({
  webcrypto: {
    subtle: {
      importKey: jest.fn(),
      verify: jest.fn(),
    },
  },
}));
jest.mock('../../../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
  },
}));
jest.mock('../../../util/deeplinks/deepLinkAnalytics', () => ({
  createDeepLinkUsedEventBuilder: jest.fn(() =>
    Promise.resolve({
      addProperties: jest.fn().mockReturnThis(),
      addSensitiveProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    }),
  ),
  mapSupportedActionToRoute: jest.fn(() => 'test-route'),
}));
jest.mock('react-native-branch', () => ({
  getLatestReferringParams: jest.fn(),
}));

const mockSubtle = QuickCrypto.webcrypto.subtle as jest.Mocked<
  typeof QuickCrypto.webcrypto.subtle
> & {
  verify: jest.Mock<Promise<boolean>>;
};

describe('handleUniversalLink', () => {
  const mockParse = jest.fn();
  const mockNavigation = { navigate: jest.fn() };
  const mockHandleMetaMaskDeeplink =
    handleMetaMaskDeeplink as jest.MockedFunction<
      typeof handleMetaMaskDeeplink
    >;
  const mockSDKConnectGetInstance = SDKConnect.getInstance as jest.Mock;
  const mockWC2ManagerGetInstance = WC2Manager.getInstance as jest.Mock;

  const instance = {
    parse: mockParse,
    navigation: mockNavigation,
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
  mockHandleDeepLinkModalDisplay.mockImplementation(async (callbackParams) => {
    if (
      callbackParams.linkType === 'invalid' ||
      callbackParams.linkType === 'unsupported'
    ) {
      callbackParams.onContinue?.(); // Primary button action (navigate to home)
    } else {
      callbackParams.onContinue();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockSDKConnectGetInstance.mockImplementation(() => ({
      getConnections: jest.fn(),
      connectToChannel: jest.fn(),
      revalidateChannel: jest.fn(),
      reconnect: jest.fn(),
      bindAndroidSDK: jest.fn().mockResolvedValue(undefined),
    }));

    mockWC2ManagerGetInstance.mockResolvedValue({
      connect: jest.fn(),
    });

    url = 'https://metamask.app.link';
  });

  describe('SDK Actions', () => {
    const testCases = [
      { action: ACTIONS.CONNECT },
      { action: ACTIONS.MMSDK },
    ] as const;

    it.each(testCases)(
      'calls handleMetaMaskDeeplink when deeplink is $url',
      async ({ action }) => {
        const testUrl = `https://link.metamask.io/${action}`;
        const expectedMappedUrl = `metamask://${action}`;
        const { urlObj: testUrlObj, params: testParams } =
          extractURLParams(expectedMappedUrl);
        const wcURL = testParams?.uri || testUrlObj.href;

        await handleUniversalLink({
          instance,
          handled,
          urlObj: testUrlObj,
          browserCallBack: mockBrowserCallBack,
          url: testUrl,
          source: 'origin',
        });

        expect(mockHandleMetaMaskDeeplink).toHaveBeenCalledWith({
          handled,
          wcURL,
          origin: 'origin',
          params: testParams,
          url: expectedMappedUrl,
        });
      },
    );
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

        await handleUniversalLink({
          instance,
          handled,
          urlObj: dappUrlObj,
          browserCallBack: mockBrowserCallBack,
          url: dappUrl,
          source: 'test-source',
        });

        expect(handled).toHaveBeenCalled();
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
    });
  });

  describe('ACTIONS.REWARDS', () => {
    it('calls _handleRewards when action is REWARDS without referral', async () => {
      const rewardsUrl = `${PROTOCOLS.HTTPS}://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.REWARDS}`;
      const rewardsUrlObj = {
        ...urlObj,
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        href: rewardsUrl,
        pathname: `/${ACTIONS.REWARDS}`,
      };

      await handleUniversalLink({
        instance,
        handled,
        urlObj: rewardsUrlObj,
        browserCallBack: mockBrowserCallBack,
        url: rewardsUrl,
        source: 'test-source',
      });

      expect(handled).toHaveBeenCalled();
    });

    it('calls _handleRewards when action is REWARDS with referral code', async () => {
      const rewardsUrl = `${PROTOCOLS.HTTPS}://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.REWARDS}?referral=code123`;
      const rewardsUrlObj = {
        ...urlObj,
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        href: rewardsUrl,
        pathname: `/${ACTIONS.REWARDS}`,
        search: '?referral=code123',
      };

      await handleUniversalLink({
        instance,
        handled,
        urlObj: rewardsUrlObj,
        browserCallBack: mockBrowserCallBack,
        url: rewardsUrl,
        source: 'test-source',
      });

      expect(handled).toHaveBeenCalled();
    });
  });

  describe('ACTIONS.PREDICT', () => {
    it('calls _handlePredict when action is PREDICT without market parameter', async () => {
      const predictUrl = `${PROTOCOLS.HTTPS}://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.PREDICT}`;
      const predictUrlObj = {
        ...urlObj,
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        href: predictUrl,
        pathname: `/${ACTIONS.PREDICT}`,
      };

      await handleUniversalLink({
        instance,
        handled,
        urlObj: predictUrlObj,
        browserCallBack: mockBrowserCallBack,
        url: predictUrl,
        source: 'test-source',
      });

      expect(handled).toHaveBeenCalled();
    });

    it('calls _handlePredict when action is PREDICT with market parameter', async () => {
      const predictUrl = `${PROTOCOLS.HTTPS}://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.PREDICT}?market=23246`;
      const predictUrlObj = {
        ...urlObj,
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        href: predictUrl,
        pathname: `/${ACTIONS.PREDICT}`,
        search: '?market=23246',
      };

      await handleUniversalLink({
        instance,
        handled,
        urlObj: predictUrlObj,
        browserCallBack: mockBrowserCallBack,
        url: predictUrl,
        source: 'test-source',
      });

      expect(handled).toHaveBeenCalled();
    });

    it('calls _handlePredict when action is PREDICT with marketId parameter', async () => {
      const predictUrl = `${PROTOCOLS.HTTPS}://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.PREDICT}?marketId=12345`;
      const predictUrlObj = {
        ...urlObj,
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        href: predictUrl,
        pathname: `/${ACTIONS.PREDICT}`,
        search: '?marketId=12345',
      };

      await handleUniversalLink({
        instance,
        handled,
        urlObj: predictUrlObj,
        browserCallBack: mockBrowserCallBack,
        url: predictUrl,
        source: 'test-source',
      });

      expect(handled).toHaveBeenCalled();
    });

    it('calls _handlePredict with full query string when multiple parameters present', async () => {
      const predictUrl = `${PROTOCOLS.HTTPS}://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.PREDICT}?market=23246&utm_source=campaign`;
      const predictUrlObj = {
        ...urlObj,
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        href: predictUrl,
        pathname: `/${ACTIONS.PREDICT}`,
        search: '?market=23246&utm_source=campaign',
      };

      await handleUniversalLink({
        instance,
        handled,
        urlObj: predictUrlObj,
        browserCallBack: mockBrowserCallBack,
        url: predictUrl,
        source: 'test-source',
      });

      expect(handled).toHaveBeenCalled();
    });
  });

  describe('ACTIONS.TRENDING', () => {
    it('calls _handleTrending when action is TRENDING', async () => {
      const trendingUrl = `${PROTOCOLS.HTTPS}://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.TRENDING}`;
      const trendingUrlObj = {
        ...urlObj,
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        href: trendingUrl,
        pathname: `/${ACTIONS.TRENDING}`,
      };

      await handleUniversalLink({
        instance,
        handled,
        urlObj: trendingUrlObj,
        browserCallBack: mockBrowserCallBack,
        url: trendingUrl,
        source: 'test-source',
      });

      expect(handled).toHaveBeenCalled();
    });

    it('calls _handleTrending with different deeplink domains', async () => {
      const testCases = [
        AppConstants.MM_UNIVERSAL_LINK_HOST,
        AppConstants.MM_IO_UNIVERSAL_LINK_HOST,
        AppConstants.MM_IO_UNIVERSAL_LINK_TEST_HOST,
      ];

      for (const domain of testCases) {
        jest.clearAllMocks();
        const trendingUrl = `${PROTOCOLS.HTTPS}://${domain}/${ACTIONS.TRENDING}`;
        const trendingUrlObj = {
          ...urlObj,
          hostname: domain,
          href: trendingUrl,
          pathname: `/${ACTIONS.TRENDING}`,
        };

        await handleUniversalLink({
          instance,
          handled,
          urlObj: trendingUrlObj,
          browserCallBack: mockBrowserCallBack,
          url: trendingUrl,
          source: 'test-source',
        });

        expect(handled).toHaveBeenCalled();
      }
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

  describe('ACTIONS.ONBOARDING', () => {
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
      'calls _handleFastOnboarding with transformed URL for $description',
      async ({ domain }) => {
        const dappUrl = `${PROTOCOLS.HTTPS}://${domain}/${ACTIONS.ONBOARDING}?param=value`;
        const origin = `${PROTOCOLS.HTTPS}://${domain}`;
        const dappUrlObj = {
          ...urlObj,
          hostname: domain,
          href: dappUrl,
          pathname: `/${ACTIONS.ONBOARDING}`,
          origin,
        };

        await handleUniversalLink({
          instance,
          handled,
          urlObj: dappUrlObj,
          browserCallBack: mockBrowserCallBack,
          url: dappUrl,
          source: 'test-source',
        });

        expect(handled).toHaveBeenCalled();
      },
    );
  });

  describe('ACTIONS.ENABLE_CARD_BUTTON', () => {
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
      'calls _handleEnableCardButton without showing modal for $description',
      async ({ domain }) => {
        const enableCardButtonUrl = `${PROTOCOLS.HTTPS}://${domain}/${ACTIONS.ENABLE_CARD_BUTTON}`;
        const origin = `${PROTOCOLS.HTTPS}://${domain}`;
        const enableCardButtonUrlObj = {
          ...urlObj,
          hostname: domain,
          href: enableCardButtonUrl,
          pathname: `/${ACTIONS.ENABLE_CARD_BUTTON}`,
          origin,
        };

        await handleUniversalLink({
          instance,
          handled,
          urlObj: enableCardButtonUrlObj,
          browserCallBack: mockBrowserCallBack,
          url: enableCardButtonUrl,
          source: 'test-source',
        });

        expect(mockHandleDeepLinkModalDisplay).not.toHaveBeenCalled();
        expect(handled).toHaveBeenCalled();
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
      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.DAPP}`,
        href: url,
      } as ReturnType<typeof extractURLParams>['urlObj'];

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

      expect(DevLogger.log).toHaveBeenCalledWith(
        'DeepLinkAnalytics: Tracked consolidated deep link event:',
        expect.any(Object),
      );
      expect(mockHandleDeepLinkModalDisplay).toHaveBeenCalledWith({
        linkType: DeepLinkModalLinkType.PUBLIC,
        pageTitle: 'Dapp',
        onContinue: expect.any(Function),
        onBack: expect.any(Function),
      });
      expect(handled).toHaveBeenCalled();
    });
  });

  describe('link type determination', () => {
    beforeEach(() => {
      DevLogger.log = jest.fn();
    });

    describe('when domain is invalid', () => {
      it('should return INVALID link type for unsupported domain', async () => {
        url = `https://invalid-domain.com/${ACTIONS.DAPP}?param1=value1`;
        urlObj = {
          hostname: 'invalid-domain.com',
          pathname: `/${ACTIONS.DAPP}`,
          href: url,
        } as ReturnType<typeof extractURLParams>['urlObj'];

        await handleUniversalLink({
          instance,
          handled,
          urlObj,
          browserCallBack: mockBrowserCallBack,
          url,
          source: 'test-source',
        });

        expect(mockHandleDeepLinkModalDisplay).toHaveBeenCalledWith({
          linkType: DeepLinkModalLinkType.INVALID,
          onContinue: expect.any(Function),
          onBack: expect.any(Function),
        });
      });
    });

    describe('when action is unsupported', () => {
      it('should return UNSUPPORTED link type for unsupported action with valid signature', async () => {
        mockSubtle.verify.mockResolvedValue(true);
        const validSignature = Buffer.from(new Array(64).fill(0)).toString(
          'base64',
        );
        const unsupportedAction = 'unsupported-action';
        url = `https://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${unsupportedAction}?param1=value1&sig=${validSignature}`;
        urlObj = {
          hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
          pathname: `/${unsupportedAction}`,
          href: url,
        } as ReturnType<typeof extractURLParams>['urlObj'];

        await handleUniversalLink({
          instance,
          handled,
          urlObj,
          browserCallBack: mockBrowserCallBack,
          url,
          source: 'test-source',
        });

        expect(mockHandleDeepLinkModalDisplay).toHaveBeenCalledWith({
          linkType: DeepLinkModalLinkType.UNSUPPORTED,
          onContinue: expect.any(Function),
          onBack: expect.any(Function),
        });
      });

      it('should return INVALID link type for unsupported action without valid signature', async () => {
        const unsupportedAction = 'unsupported-action';
        url = `https://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${unsupportedAction}?param1=value1`;
        urlObj = {
          hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
          pathname: `/${unsupportedAction}`,
          href: url,
        } as ReturnType<typeof extractURLParams>['urlObj'];

        await handleUniversalLink({
          instance,
          handled,
          urlObj,
          browserCallBack: mockBrowserCallBack,
          url,
          source: 'test-source',
        });

        expect(mockHandleDeepLinkModalDisplay).toHaveBeenCalledWith({
          linkType: DeepLinkModalLinkType.INVALID,
          onContinue: expect.any(Function),
          onBack: expect.any(Function),
        });
      });

      it('should return INVALID link type for unsupported action with invalid signature', async () => {
        mockSubtle.verify.mockResolvedValue(false);
        const invalidSignature = 'invalid-signature';
        const unsupportedAction = 'unsupported-action';
        url = `https://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${unsupportedAction}?param1=value1&sig=${invalidSignature}`;
        urlObj = {
          hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
          pathname: `/${unsupportedAction}`,
          href: url,
        } as ReturnType<typeof extractURLParams>['urlObj'];

        await handleUniversalLink({
          instance,
          handled,
          urlObj,
          browserCallBack: mockBrowserCallBack,
          url,
          source: 'test-source',
        });

        expect(mockHandleDeepLinkModalDisplay).toHaveBeenCalledWith({
          linkType: DeepLinkModalLinkType.INVALID,
          onContinue: expect.any(Function),
          onBack: expect.any(Function),
        });
      });
    });

    describe('when action is supported', () => {
      it('should return PRIVATE link type for supported action with valid signature', async () => {
        mockSubtle.verify.mockResolvedValue(true);
        const validSignature = Buffer.from(new Array(64).fill(0)).toString(
          'base64',
        );
        url = `https://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.DAPP}?param1=value1&sig=${validSignature}`;
        urlObj = {
          hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
          pathname: `/${ACTIONS.DAPP}`,
          href: url,
        } as ReturnType<typeof extractURLParams>['urlObj'];

        await handleUniversalLink({
          instance,
          handled,
          urlObj,
          browserCallBack: mockBrowserCallBack,
          url,
          source: 'test-source',
        });

        expect(mockHandleDeepLinkModalDisplay).toHaveBeenCalledWith({
          linkType: DeepLinkModalLinkType.PRIVATE,
          pageTitle: 'Dapp',
          onContinue: expect.any(Function),
          onBack: expect.any(Function),
        });
      });

      it('should return PUBLIC link type for supported action without signature', async () => {
        url = `https://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.DAPP}?param1=value1`;
        urlObj = {
          hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
          pathname: `/${ACTIONS.DAPP}`,
          href: url,
        } as ReturnType<typeof extractURLParams>['urlObj'];

        await handleUniversalLink({
          instance,
          handled,
          urlObj,
          browserCallBack: mockBrowserCallBack,
          url,
          source: 'test-source',
        });

        expect(mockHandleDeepLinkModalDisplay).toHaveBeenCalledWith({
          linkType: DeepLinkModalLinkType.PUBLIC,
          pageTitle: 'Dapp',
          onContinue: expect.any(Function),
          onBack: expect.any(Function),
        });
      });

      it('should return PUBLIC link type for supported action with invalid signature', async () => {
        mockSubtle.verify.mockResolvedValue(false);
        const invalidSignature = 'invalid-signature';
        url = `https://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.DAPP}?param1=value1&sig=${invalidSignature}`;
        urlObj = {
          hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
          pathname: `/${ACTIONS.DAPP}`,
          href: url,
        } as ReturnType<typeof extractURLParams>['urlObj'];

        await handleUniversalLink({
          instance,
          handled,
          urlObj,
          browserCallBack: mockBrowserCallBack,
          url,
          source: 'test-source',
        });

        expect(mockHandleDeepLinkModalDisplay).toHaveBeenCalledWith({
          linkType: DeepLinkModalLinkType.PUBLIC,
          pageTitle: 'Dapp',
          onContinue: expect.any(Function),
          onBack: expect.any(Function),
        });
      });

      it('should return PUBLIC link type for supported action with missing signature', async () => {
        url = `https://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.DAPP}?param1=value1&sig=`;
        urlObj = {
          hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
          pathname: `/${ACTIONS.DAPP}`,
          href: url,
        } as ReturnType<typeof extractURLParams>['urlObj'];

        await handleUniversalLink({
          instance,
          handled,
          urlObj,
          browserCallBack: mockBrowserCallBack,
          url,
          source: 'test-source',
        });

        expect(mockHandleDeepLinkModalDisplay).toHaveBeenCalledWith({
          linkType: DeepLinkModalLinkType.PUBLIC,
          pageTitle: 'Dapp',
          onContinue: expect.any(Function),
          onBack: expect.any(Function),
        });
      });
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
      },
    );

    it('does not show interstitial modal for WC action', async () => {
      const wcUri = 'wc:abc123@2?relay-protocol=irn&symKey=xyz';
      const encodedWcUri = encodeURIComponent(wcUri);
      const wcUrl = `${PROTOCOLS.HTTPS}://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${ACTIONS.WC}?uri=${encodedWcUri}`;
      const wcUrlObj = {
        ...urlObj,
        hostname: AppConstants.MM_IO_UNIVERSAL_LINK_HOST,
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

      expect(mockHandleDeepLinkModalDisplay).not.toHaveBeenCalled();
      expect(handled).toHaveBeenCalled();
      expect(mockParse).toHaveBeenCalledWith(wcUri, {
        origin: 'test-source',
      });
    });

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

    describe('in-app link sources', () => {
      const inAppSources = [
        AppConstants.DEEPLINKS.ORIGIN_CAROUSEL,
        AppConstants.DEEPLINKS.ORIGIN_NOTIFICATION,
        AppConstants.DEEPLINKS.ORIGIN_IN_APP_BROWSER,
        AppConstants.DEEPLINKS.ORIGIN_QR_CODE,
        AppConstants.DEEPLINKS.ORIGIN_PUSH_NOTIFICATION,
      ];

      const validSignature = Buffer.from(new Array(64).fill(0)).toString(
        'base64',
      );

      beforeEach(() => {
        mockSubtle.verify.mockResolvedValue(true);
      });

      it.each(inAppSources)(
        'skips modal when source is "%s" with signed (PRIVATE) link',
        async (testSource) => {
          const signedUrl = `${PROTOCOLS.HTTPS}://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${ACTIONS.DAPP}/example.com?sig=${validSignature}`;
          const testUrlObj = {
            ...urlObj,
            hostname: AppConstants.MM_IO_UNIVERSAL_LINK_HOST,
            href: signedUrl,
            pathname: `/${ACTIONS.DAPP}/example.com`,
          };

          await handleUniversalLink({
            instance,
            handled,
            urlObj: testUrlObj,
            browserCallBack: mockBrowserCallBack,
            url: signedUrl,
            source: testSource,
          });

          expect(mockHandleDeepLinkModalDisplay).not.toHaveBeenCalled();
          expect(handled).toHaveBeenCalled();
        },
      );

      it.each(inAppSources)(
        'displays "Proceed with caution" modal when source is "%s" with unsigned (PUBLIC) link',
        async (testSource) => {
          const unsignedUrl = `${PROTOCOLS.HTTPS}://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${ACTIONS.DAPP}/example.com`;
          const testUrlObj = {
            ...urlObj,
            hostname: AppConstants.MM_IO_UNIVERSAL_LINK_HOST,
            href: unsignedUrl,
            pathname: `/${ACTIONS.DAPP}/example.com`,
          };

          await handleUniversalLink({
            instance,
            handled,
            urlObj: testUrlObj,
            browserCallBack: mockBrowserCallBack,
            url: unsignedUrl,
            source: testSource,
          });

          expect(mockHandleDeepLinkModalDisplay).toHaveBeenCalledWith({
            linkType: DeepLinkModalLinkType.PUBLIC,
            pageTitle: 'Dapp',
            onContinue: expect.any(Function),
            onBack: expect.any(Function),
          });
          expect(handled).toHaveBeenCalled();
        },
      );
    });

    describe('external sources always show redirect modal', () => {
      const sourcesRequiringModal = [AppConstants.DEEPLINKS.ORIGIN_DEEPLINK];

      const validSignature = Buffer.from(new Array(64).fill(0)).toString(
        'base64',
      );

      beforeEach(() => {
        mockSubtle.verify.mockResolvedValue(true);
      });

      it.each(sourcesRequiringModal)(
        'displays "Redirecting you to MetaMask" modal when source is "%s" with signed (PRIVATE) link',
        async (testSource) => {
          const signedUrl = `${PROTOCOLS.HTTPS}://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${ACTIONS.DAPP}/example.com?sig=${validSignature}`;
          const testUrlObj = {
            ...urlObj,
            hostname: AppConstants.MM_IO_UNIVERSAL_LINK_HOST,
            href: signedUrl,
            pathname: `/${ACTIONS.DAPP}/example.com`,
          };

          await handleUniversalLink({
            instance,
            handled,
            urlObj: testUrlObj,
            browserCallBack: mockBrowserCallBack,
            url: signedUrl,
            source: testSource,
          });

          expect(mockHandleDeepLinkModalDisplay).toHaveBeenCalledWith({
            linkType: DeepLinkModalLinkType.PRIVATE,
            pageTitle: 'Dapp',
            onContinue: expect.any(Function),
            onBack: expect.any(Function),
          });
          expect(handled).toHaveBeenCalled();
        },
      );

      it.each(sourcesRequiringModal)(
        'displays "Proceed with caution" modal when source is "%s" with unsigned (PUBLIC) link',
        async (testSource) => {
          const unsignedUrl = `${PROTOCOLS.HTTPS}://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${ACTIONS.DAPP}/example.com`;
          const testUrlObj = {
            ...urlObj,
            hostname: AppConstants.MM_IO_UNIVERSAL_LINK_HOST,
            href: unsignedUrl,
            pathname: `/${ACTIONS.DAPP}/example.com`,
          };

          await handleUniversalLink({
            instance,
            handled,
            urlObj: testUrlObj,
            browserCallBack: mockBrowserCallBack,
            url: unsignedUrl,
            source: testSource,
          });

          expect(mockHandleDeepLinkModalDisplay).toHaveBeenCalledWith({
            linkType: DeepLinkModalLinkType.PUBLIC,
            pageTitle: 'Dapp',
            onContinue: expect.any(Function),
            onBack: expect.any(Function),
          });
          expect(handled).toHaveBeenCalled();
        },
      );
    });

    describe('non-whitelisted sources', () => {
      it('displays interstitial modal when source is not whitelisted and URL is not whitelisted', async () => {
        const nonWhitelistedSource = 'external-browser';
        const nonWhitelistedUrl = `${PROTOCOLS.HTTPS}://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${ACTIONS.DAPP}/example.com`;
        const testUrlObj = {
          ...urlObj,
          hostname: AppConstants.MM_IO_UNIVERSAL_LINK_HOST,
          href: nonWhitelistedUrl,
          pathname: `/${ACTIONS.DAPP}/example.com`,
        };

        await handleUniversalLink({
          instance,
          handled,
          urlObj: testUrlObj,
          browserCallBack: mockBrowserCallBack,
          url: nonWhitelistedUrl,
          source: nonWhitelistedSource,
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

    describe('external sources show modal regardless of signature status', () => {
      const sourcesRequiringModal = [AppConstants.DEEPLINKS.ORIGIN_DEEPLINK];

      const validSignature = Buffer.from(new Array(64).fill(0)).toString(
        'base64',
      );

      beforeEach(() => {
        mockSubtle.verify.mockResolvedValue(true);
      });

      it.each(sourcesRequiringModal)(
        'displays "Redirecting you to MetaMask" modal when source is "%s" with signed (PRIVATE) link',
        async (testSource) => {
          const signedUrl = `${PROTOCOLS.HTTPS}://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${ACTIONS.DAPP}/example.com?sig=${validSignature}`;
          const testUrlObj = {
            ...urlObj,
            hostname: AppConstants.MM_IO_UNIVERSAL_LINK_HOST,
            href: signedUrl,
            pathname: `/${ACTIONS.DAPP}/example.com`,
          };

          await handleUniversalLink({
            instance,
            handled,
            urlObj: testUrlObj,
            browserCallBack: mockBrowserCallBack,
            url: signedUrl,
            source: testSource,
          });

          expect(mockHandleDeepLinkModalDisplay).toHaveBeenCalledWith({
            linkType: DeepLinkModalLinkType.PRIVATE,
            pageTitle: 'Dapp',
            onContinue: expect.any(Function),
            onBack: expect.any(Function),
          });
          expect(handled).toHaveBeenCalled();
        },
      );

      it.each(sourcesRequiringModal)(
        'displays "Proceed with caution" modal when source is "%s" with unsigned (PUBLIC) link',
        async (testSource) => {
          const unsignedUrl = `${PROTOCOLS.HTTPS}://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${ACTIONS.DAPP}/example.com`;
          const testUrlObj = {
            ...urlObj,
            hostname: AppConstants.MM_IO_UNIVERSAL_LINK_HOST,
            href: unsignedUrl,
            pathname: `/${ACTIONS.DAPP}/example.com`,
          };

          await handleUniversalLink({
            instance,
            handled,
            urlObj: testUrlObj,
            browserCallBack: mockBrowserCallBack,
            url: unsignedUrl,
            source: testSource,
          });

          expect(mockHandleDeepLinkModalDisplay).toHaveBeenCalledWith({
            linkType: DeepLinkModalLinkType.PUBLIC,
            pageTitle: 'Dapp',
            onContinue: expect.any(Function),
            onBack: expect.any(Function),
          });
          expect(handled).toHaveBeenCalled();
        },
      );
    });

    describe('sources not in inAppLinkSources', () => {
      it('skips interstitial modal when URL is whitelisted even with non-whitelisted source', async () => {
        const nonWhitelistedSource = 'external-browser';
        const whitelistedUrl =
          'https://link.metamask.io/perps-asset?symbol=ETH';
        const parsedUrl = new URL(whitelistedUrl);
        const testUrlObj = {
          ...urlObj,
          hostname: parsedUrl.hostname,
          href: whitelistedUrl,
          pathname: parsedUrl.pathname,
        };

        await handleUniversalLink({
          instance,
          handled,
          urlObj: testUrlObj,
          browserCallBack: mockBrowserCallBack,
          url: whitelistedUrl,
          source: nonWhitelistedSource,
        });

        expect(mockHandleDeepLinkModalDisplay).not.toHaveBeenCalled();
        expect(handled).toHaveBeenCalled();
      });
    });
  });

  describe('skips handling deeplinks without pathname and query params', () => {
    // Link cases to test for skipping handling
    const testLinkCases = [
      {
        link: 'metamask://',
        shouldSkip: true,
      },
      {
        link: 'https://link.metamask.io/',
        shouldSkip: true,
      },
      {
        link: 'https://link.metamask.io',
        shouldSkip: true,
      },
      {
        link: 'https://link.metamask.io/action',
        shouldSkip: false,
      },
      {
        link: 'https://link.metamask.io/action?query=value',
        shouldSkip: false,
      },
      {
        link: 'metamask://action',
        shouldSkip: false,
      },
      {
        link: 'metamask://action?query=value',
        shouldSkip: false,
      },
    ];

    testLinkCases.forEach((testCase) => {
      it(`${testCase.shouldSkip ? 'skips' : 'does NOT skip'} handling ${testCase.link}`, async () => {
        const hasSignatureSpy = jest.spyOn(signatureUtils, 'hasSignature');

        const mappedUrl = testCase.link.replace(
          `${PROTOCOLS.METAMASK}://`,
          `${PROTOCOLS.HTTPS}://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/`,
        );
        const { urlObj: testUrlObj } = extractURLParams(mappedUrl);
        await handleUniversalLink({
          instance,
          handled,
          urlObj: testUrlObj,
          browserCallBack: mockBrowserCallBack,
          url: mappedUrl,
          source: 'origin',
        });

        if (testCase.shouldSkip) {
          expect(hasSignatureSpy).not.toHaveBeenCalled();
        } else {
          expect(hasSignatureSpy).toHaveBeenCalled();
        }
      });
    });
  });

  describe('async handleDeepLinkModalDisplay behavior', () => {
    it('waits for handleDeepLinkModalDisplay to complete before resolving interstitial action', async () => {
      let modalDisplayComplete = false;
      let callbackExecuted = false;

      mockHandleDeepLinkModalDisplay.mockImplementation(
        async (callbackParams) => {
          // Simulate async operations (like analytics tracking)
          await new Promise((resolve) => setTimeout(resolve, 100));
          modalDisplayComplete = true;

          if (callbackParams.linkType === 'public') {
            callbackParams.onContinue();
            callbackExecuted = true;
          }
        },
      );

      url = `https://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${ACTIONS.DAPP}?param1=value1`;
      urlObj = {
        hostname: AppConstants.MM_IO_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.DAPP}`,
        href: url,
      } as ReturnType<typeof extractURLParams>['urlObj'];

      await handleUniversalLink({
        instance,
        handled,
        urlObj,
        browserCallBack: mockBrowserCallBack,
        url,
        source: 'test-source',
      });

      expect(modalDisplayComplete).toBe(true);
      expect(callbackExecuted).toBe(true);
      expect(handled).toHaveBeenCalled();
    });

    it('waits for handleDeepLinkModalDisplay to complete before handling rejection', async () => {
      let modalDisplayComplete = false;
      let callbackExecuted = false;

      mockHandleDeepLinkModalDisplay.mockImplementation(
        async (callbackParams) => {
          // Simulate async operations (like analytics tracking)
          await new Promise((resolve) => setTimeout(resolve, 100));
          modalDisplayComplete = true;

          if (callbackParams.linkType === 'invalid') {
            callbackParams.onBack();
            callbackExecuted = true;
          }
        },
      );

      url = 'https://invalid-domain.com/some-action';
      urlObj = {
        hostname: 'invalid-domain.com',
        pathname: '/some-action',
        href: url,
      } as ReturnType<typeof extractURLParams>['urlObj'];

      const result = await handleUniversalLink({
        instance,
        handled,
        urlObj,
        browserCallBack: mockBrowserCallBack,
        url,
        source: 'test-source',
      });

      expect(modalDisplayComplete).toBe(true);
      expect(callbackExecuted).toBe(true);
      expect(result).toBe(false);
      expect(handled).toHaveBeenCalled();
    });

    it('passes correct signature status to analytics context for valid signatures', async () => {
      mockHandleDeepLinkModalDisplay.mockImplementation(
        async (callbackParams) => {
          // Verify signature status is correct
          expect(callbackParams).toBeDefined();
          if (callbackParams.linkType === 'private') {
            callbackParams.onContinue();
          }
        },
      );

      mockSubtle.verify.mockResolvedValue(true);
      const validSignature = Buffer.from(new Array(64).fill(0)).toString(
        'base64',
      );
      url = `https://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.DAPP}?param1=value1&sig=${validSignature}`;
      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.DAPP}`,
        href: url,
      } as ReturnType<typeof extractURLParams>['urlObj'];

      await handleUniversalLink({
        instance,
        handled,
        urlObj,
        browserCallBack: mockBrowserCallBack,
        url,
        source: 'test-source',
      });

      expect(mockHandleDeepLinkModalDisplay).toHaveBeenCalledWith(
        expect.objectContaining({
          linkType: DeepLinkModalLinkType.PRIVATE,
          pageTitle: 'Dapp',
        }),
      );
    });

    it('passes correct signature status to analytics context for invalid signatures', async () => {
      mockHandleDeepLinkModalDisplay.mockImplementation(
        async (callbackParams) => {
          if (callbackParams.linkType === 'public') {
            callbackParams.onContinue();
          }
        },
      );

      mockSubtle.verify.mockResolvedValue(false);
      url = `https://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.DAPP}?param1=value1&sig=invalid`;
      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.DAPP}`,
        href: url,
      } as ReturnType<typeof extractURLParams>['urlObj'];

      await handleUniversalLink({
        instance,
        handled,
        urlObj,
        browserCallBack: mockBrowserCallBack,
        url,
        source: 'test-source',
      });

      expect(mockHandleDeepLinkModalDisplay).toHaveBeenCalledWith(
        expect.objectContaining({
          linkType: DeepLinkModalLinkType.PUBLIC,
          pageTitle: 'Dapp',
        }),
      );
    });

    it('passes correct signature status to analytics context when signature is missing', async () => {
      mockHandleDeepLinkModalDisplay.mockImplementation(
        async (callbackParams) => {
          if (callbackParams.linkType === 'public') {
            callbackParams.onContinue();
          }
        },
      );

      url = `https://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.DAPP}?param1=value1`;
      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.DAPP}`,
        href: url,
      } as ReturnType<typeof extractURLParams>['urlObj'];

      await handleUniversalLink({
        instance,
        handled,
        urlObj,
        browserCallBack: mockBrowserCallBack,
        url,
        source: 'test-source',
      });

      expect(mockHandleDeepLinkModalDisplay).toHaveBeenCalledWith(
        expect.objectContaining({
          linkType: DeepLinkModalLinkType.PUBLIC,
          pageTitle: 'Dapp',
        }),
      );
    });
  });

  describe('consolidated analytics tracking', () => {
    interface MockMetricsInstance {
      trackEvent: jest.Mock;
    }

    interface MockEventBuilder {
      addProperties: jest.Mock;
      addSensitiveProperties: jest.Mock;
      build: jest.Mock;
    }

    let mockAnalytics: MockMetricsInstance;
    let mockCreateEventBuilder: jest.MockedFunction<
      () => Promise<MockEventBuilder>
    >;
    const { analytics } = jest.requireMock(
      '../../../../../util/analytics/analytics',
    );
    const { createDeepLinkUsedEventBuilder } = jest.requireMock(
      '../../../util/deeplinks/deepLinkAnalytics',
    );
    const ReduxService = jest.requireMock('../../../../redux') as {
      default: {
        store: {
          getState: jest.Mock;
          dispatch: jest.Mock;
        };
      };
    };

    beforeEach(() => {
      // Reset mock return value to default
      ReduxService.default.store.getState.mockReturnValue({
        settings: {
          deepLinkModalDisabled: false,
        },
      });
      mockAnalytics = {
        trackEvent: jest.fn(),
      };
      analytics.trackEvent = mockAnalytics.trackEvent;

      mockCreateEventBuilder = jest.fn(() =>
        Promise.resolve({
          addProperties: jest.fn().mockReturnThis(),
          addSensitiveProperties: jest.fn().mockReturnThis(),
          build: jest.fn().mockReturnValue({ eventName: 'DEEP_LINK_USED' }),
        }),
      );
      createDeepLinkUsedEventBuilder.mockImplementation(mockCreateEventBuilder);
    });

    it('tracks analytics for REJECTED interstitial before early return', async () => {
      mockHandleDeepLinkModalDisplay.mockImplementation(
        async (callbackParams) => {
          if (callbackParams.linkType === 'public') {
            callbackParams.onBack(); // User rejects
          }
        },
      );

      url = `https://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.SWAP}`;
      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.SWAP}`,
        href: url,
      } as ReturnType<typeof extractURLParams>['urlObj'];

      const result = await handleUniversalLink({
        instance,
        handled,
        urlObj,
        browserCallBack: mockBrowserCallBack,
        url,
        source: 'test-source',
      });

      expect(result).toBe(false); // Early return happened
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        expect.objectContaining({
          interstitialAction: 'rejected',
        }),
      );
      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith({
        eventName: 'DEEP_LINK_USED',
      });
    });

    it('tracks analytics with wasInterstitialShown=false for whitelisted WC action', async () => {
      url = `https://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.WC}?uri=test`;
      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.WC}`,
        href: url,
      } as ReturnType<typeof extractURLParams>['urlObj'];

      await handleUniversalLink({
        instance,
        handled,
        urlObj,
        browserCallBack: mockBrowserCallBack,
        url,
        source: 'test-source',
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        expect.objectContaining({
          interstitialShown: false, // Whitelisted, modal not shown
          interstitialAction: 'accepted',
        }),
      );
      expect(mockAnalytics.trackEvent).toHaveBeenCalled();
    });

    it('tracks analytics with correct interstitialDisabled state', async () => {
      // Mock modal disabled state
      ReduxService.default.store.getState.mockReturnValue({
        settings: {
          deepLinkModalDisabled: true,
        },
      });

      mockHandleDeepLinkModalDisplay.mockImplementation(
        async (callbackParams) => {
          if (callbackParams.linkType === 'public') {
            callbackParams.onContinue();
          }
        },
      );

      url = `https://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.SWAP}`;
      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.SWAP}`,
        href: url,
      } as ReturnType<typeof extractURLParams>['urlObj'];

      await handleUniversalLink({
        instance,
        handled,
        urlObj,
        browserCallBack: mockBrowserCallBack,
        url,
        source: 'test-source',
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        expect.objectContaining({
          interstitialDisabled: true, // User has disabled modal
        }),
      );
      expect(mockAnalytics.trackEvent).toHaveBeenCalled();
    });

    it('tracks analytics with wasInterstitialShown=true when modal shown and user accepts', async () => {
      ReduxService.default.store.getState.mockReturnValue({
        settings: {
          deepLinkModalDisabled: false,
        },
      });

      mockHandleDeepLinkModalDisplay.mockImplementation(
        async (callbackParams) => {
          if (callbackParams.linkType === 'public') {
            callbackParams.onContinue(); // User accepts
          }
        },
      );

      url = `https://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.SWAP}`;
      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.SWAP}`,
        href: url,
      } as ReturnType<typeof extractURLParams>['urlObj'];

      await handleUniversalLink({
        instance,
        handled,
        urlObj,
        browserCallBack: mockBrowserCallBack,
        url,
        source: 'test-source',
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        expect.objectContaining({
          interstitialShown: true, // Modal was shown
          interstitialAction: 'accepted',
        }),
      );
      expect(mockAnalytics.trackEvent).toHaveBeenCalled();
    });

    it('tracks analytics only once per deep link', async () => {
      mockHandleDeepLinkModalDisplay.mockImplementation(
        async (callbackParams) => {
          if (callbackParams.linkType === 'public') {
            callbackParams.onContinue();
          }
        },
      );

      url = `https://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.SWAP}`;
      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.SWAP}`,
        href: url,
      } as ReturnType<typeof extractURLParams>['urlObj'];

      await handleUniversalLink({
        instance,
        handled,
        urlObj,
        browserCallBack: mockBrowserCallBack,
        url,
        source: 'test-source',
      });

      // Analytics should be tracked exactly once
      expect(mockAnalytics.trackEvent).toHaveBeenCalledTimes(1);
      expect(mockCreateEventBuilder).toHaveBeenCalledTimes(1);
    });

    it('tracks analytics with ACCEPTED for invalid link primary button action', async () => {
      ReduxService.default.store.getState.mockReturnValue({
        settings: {
          deepLinkModalDisabled: false,
        },
      });

      mockHandleDeepLinkModalDisplay.mockImplementation(
        async (callbackParams) => {
          if (callbackParams.linkType === 'invalid') {
            callbackParams.onContinue?.(); // Primary button (navigate to home)
          }
        },
      );

      url = 'https://invalid-domain.com/some-action';
      urlObj = {
        hostname: 'invalid-domain.com',
        pathname: '/some-action',
        href: url,
      } as ReturnType<typeof extractURLParams>['urlObj'];

      await handleUniversalLink({
        instance,
        handled,
        urlObj,
        browserCallBack: mockBrowserCallBack,
        url,
        source: 'test-source',
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        expect.objectContaining({
          interstitialShown: true,
          interstitialAction: 'accepted',
        }),
      );
      expect(mockAnalytics.trackEvent).toHaveBeenCalled();
    });

    it('tracks analytics with REJECTED for invalid link close button action', async () => {
      ReduxService.default.store.getState.mockReturnValue({
        settings: {
          deepLinkModalDisabled: false,
        },
      });

      mockHandleDeepLinkModalDisplay.mockImplementation(
        async (callbackParams) => {
          if (callbackParams.linkType === 'invalid') {
            callbackParams.onBack(); // Close button (dismiss)
          }
        },
      );

      url = 'https://invalid-domain.com/some-action';
      urlObj = {
        hostname: 'invalid-domain.com',
        pathname: '/some-action',
        href: url,
      } as ReturnType<typeof extractURLParams>['urlObj'];

      await handleUniversalLink({
        instance,
        handled,
        urlObj,
        browserCallBack: mockBrowserCallBack,
        url,
        source: 'test-source',
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        expect.objectContaining({
          interstitialShown: true,
          interstitialAction: 'rejected',
        }),
      );
      expect(mockAnalytics.trackEvent).toHaveBeenCalled();
    });

    it('tracks analytics with ACCEPTED for unsupported link primary button action', async () => {
      ReduxService.default.store.getState.mockReturnValue({
        settings: {
          deepLinkModalDisabled: false,
        },
      });

      mockSubtle.verify.mockResolvedValue(true);
      const validSignature = Buffer.from(new Array(64).fill(0)).toString(
        'base64',
      );
      const unsupportedAction = 'unsupported-action';

      mockHandleDeepLinkModalDisplay.mockImplementation(
        async (callbackParams) => {
          if (callbackParams.linkType === 'unsupported') {
            callbackParams.onContinue?.(); // Primary button (navigate to home)
          }
        },
      );

      url = `https://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${unsupportedAction}?param1=value1&sig=${validSignature}`;
      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${unsupportedAction}`,
        href: url,
      } as ReturnType<typeof extractURLParams>['urlObj'];

      await handleUniversalLink({
        instance,
        handled,
        urlObj,
        browserCallBack: mockBrowserCallBack,
        url,
        source: 'test-source',
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        expect.objectContaining({
          interstitialShown: true,
          interstitialAction: 'accepted',
        }),
      );
      expect(mockAnalytics.trackEvent).toHaveBeenCalled();
    });

    it('tracks analytics with REJECTED for unsupported link close button action', async () => {
      ReduxService.default.store.getState.mockReturnValue({
        settings: {
          deepLinkModalDisabled: false,
        },
      });

      mockSubtle.verify.mockResolvedValue(true);
      const validSignature = Buffer.from(new Array(64).fill(0)).toString(
        'base64',
      );
      const unsupportedAction = 'unsupported-action';

      mockHandleDeepLinkModalDisplay.mockImplementation(
        async (callbackParams) => {
          if (callbackParams.linkType === 'unsupported') {
            callbackParams.onBack(); // Close button (dismiss)
          }
        },
      );

      url = `https://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${unsupportedAction}?param1=value1&sig=${validSignature}`;
      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${unsupportedAction}`,
        href: url,
      } as ReturnType<typeof extractURLParams>['urlObj'];

      await handleUniversalLink({
        instance,
        handled,
        urlObj,
        browserCallBack: mockBrowserCallBack,
        url,
        source: 'test-source',
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        expect.objectContaining({
          interstitialShown: true,
          interstitialAction: 'rejected',
        }),
      );
      expect(mockAnalytics.trackEvent).toHaveBeenCalled();
    });

    describe('Branch.io params integration', () => {
      const branch = jest.requireMock('react-native-branch') as {
        getLatestReferringParams: jest.Mock;
      };

      beforeEach(() => {
        jest.clearAllMocks();
        branch.getLatestReferringParams.mockClear();
      });

      it('includes branchParams in analytics context for whitelisted actions', async () => {
        const mockBranchParams = {
          '+clicked_branch_link': true,
          '+is_first_session': false,
        };
        branch.getLatestReferringParams.mockResolvedValue(mockBranchParams);

        url = `https://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.WC}?uri=wc:test`;
        urlObj = {
          hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
          pathname: `/${ACTIONS.WC}`,
          href: url,
        } as ReturnType<typeof extractURLParams>['urlObj'];

        await handleUniversalLink({
          instance,
          handled,
          urlObj,
          browserCallBack: mockBrowserCallBack,
          url,
          source: 'test-source',
        });

        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          expect.objectContaining({
            branchParams: mockBranchParams,
          }),
        );
      });

      it('includes branchParams in analytics context for modal display path', async () => {
        const mockBranchParams = {
          '+clicked_branch_link': true,
          '+is_first_session': true,
        };
        branch.getLatestReferringParams.mockResolvedValue(mockBranchParams);

        mockHandleDeepLinkModalDisplay.mockImplementation(
          async (callbackParams) => {
            if (callbackParams.linkType === 'public') {
              callbackParams.onContinue();
            }
          },
        );

        url = `https://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.SWAP}?from=ETH&to=USDC`;
        urlObj = {
          hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
          pathname: `/${ACTIONS.SWAP}`,
          href: url,
        } as ReturnType<typeof extractURLParams>['urlObj'];

        await handleUniversalLink({
          instance,
          handled,
          urlObj,
          browserCallBack: mockBrowserCallBack,
          url,
          source: 'test-source',
        });

        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          expect.objectContaining({
            branchParams: mockBranchParams,
          }),
        );
      });

      it('includes undefined branchParams in analytics context when Branch.io returns null', async () => {
        branch.getLatestReferringParams.mockResolvedValue(null);

        url = `https://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.WC}?uri=wc:test`;
        urlObj = {
          hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
          pathname: `/${ACTIONS.WC}`,
          href: url,
        } as ReturnType<typeof extractURLParams>['urlObj'];

        await handleUniversalLink({
          instance,
          handled,
          urlObj,
          browserCallBack: mockBrowserCallBack,
          url,
          source: 'test-source',
        });

        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          expect.objectContaining({
            branchParams: undefined,
          }),
        );
      });

      it('includes undefined branchParams in analytics context when Branch.io returns empty object', async () => {
        branch.getLatestReferringParams.mockResolvedValue({});

        url = `https://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.WC}?uri=wc:test`;
        urlObj = {
          hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
          pathname: `/${ACTIONS.WC}`,
          href: url,
        } as ReturnType<typeof extractURLParams>['urlObj'];

        await handleUniversalLink({
          instance,
          handled,
          urlObj,
          browserCallBack: mockBrowserCallBack,
          url,
          source: 'test-source',
        });

        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          expect.objectContaining({
            branchParams: undefined,
          }),
        );
      });

      it('includes undefined branchParams in analytics context when Branch.io fetch fails', async () => {
        branch.getLatestReferringParams.mockRejectedValue(
          new Error('Branch.io error'),
        );

        url = `https://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.WC}?uri=wc:test`;
        urlObj = {
          hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
          pathname: `/${ACTIONS.WC}`,
          href: url,
        } as ReturnType<typeof extractURLParams>['urlObj'];

        await handleUniversalLink({
          instance,
          handled,
          urlObj,
          browserCallBack: mockBrowserCallBack,
          url,
          source: 'test-source',
        });

        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          expect.objectContaining({
            branchParams: undefined,
          }),
        );
      });

      it('includes undefined branchParams in analytics context when Branch.io fetch times out', async () => {
        branch.getLatestReferringParams.mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(() => resolve({}), 1000);
            }),
        );

        url = `https://${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.WC}?uri=wc:test`;
        urlObj = {
          hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
          pathname: `/${ACTIONS.WC}`,
          href: url,
        } as ReturnType<typeof extractURLParams>['urlObj'];

        await handleUniversalLink({
          instance,
          handled,
          urlObj,
          browserCallBack: mockBrowserCallBack,
          url,
          source: 'test-source',
        });

        // Should still proceed with undefined branchParams
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          expect.objectContaining({
            branchParams: undefined,
          }),
        );
      });
    });
  });
});

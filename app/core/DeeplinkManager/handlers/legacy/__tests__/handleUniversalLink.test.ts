import QuickCrypto from 'react-native-quick-crypto';
import {
  ACTIONS,
  PROTOCOLS,
  PREFIXES,
} from '../../../../../constants/deeplinks';
import AppConstants from '../../../../AppConstants';
import SDKConnect from '../../../../SDKConnect/SDKConnect';
import handleDeeplink from '../../../../SDKConnect/handlers/handleDeeplink';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';
import WC2Manager from '../../../../WalletConnect/WalletConnectV2';
import DeeplinkManager from '../../../DeeplinkManager';
import extractURLParams from '../../../utils/extractURLParams';
import handleUniversalLink from '../handleUniversalLink';
import handleDeepLinkModalDisplay from '../handleDeepLinkModalDisplay';
import { DeepLinkModalLinkType } from '../../../../../components/UI/DeepLinkModal';
import handleMetaMaskDeeplink from '../handleMetaMaskDeeplink';

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
  const mockNavigation = { navigate: jest.fn() };
  const mockConnectToChannel = jest.fn();
  const mockGetConnections = jest.fn();
  const mockRevalidateChannel = jest.fn();
  const mockReconnect = jest.fn();
  const mockWC2ManagerConnect = jest.fn();
  const mockBindAndroidSDK = jest.fn();

  const mockHandleDeeplink = handleDeeplink as jest.Mock;
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
  mockHandleDeepLinkModalDisplay.mockImplementation((callbackParams) => {
    if (
      callbackParams.linkType === 'invalid' ||
      callbackParams.linkType === 'unsupported'
    ) {
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

  describe('SDK Actions', () => {
    const testCases = [
      { action: ACTIONS.ANDROID_SDK },
      { action: ACTIONS.CONNECT },
      { action: ACTIONS.MMSDK },
    ] as const;

    it.each(testCases)(
      'calls handleMetaMaskDeeplink when deeplink is $url',
      async ({ action }) => {
        const url = `https://link.metamask.io/${action}`;
        const expectedMappedUrl = `metamask://${action}`;
        const { urlObj, params } = extractURLParams(expectedMappedUrl);
        const wcURL = params?.uri || urlObj.href;

        await handleUniversalLink({
          instance,
          handled,
          urlObj,
          browserCallBack: mockBrowserCallBack,
          url,
          source: 'origin',
        });

        expect(mockHandleMetaMaskDeeplink).toHaveBeenCalledWith({
          instance,
          handled,
          wcURL,
          origin: 'origin',
          params,
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
          pageTitle: 'Dapp',
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
          pageTitle: 'Unsupported action',
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
          pageTitle: 'Unsupported action',
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
          pageTitle: 'Unsupported action',
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
  });
});

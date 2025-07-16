import QuickCrypto from 'react-native-quick-crypto';
import { ACTIONS } from '../../../constants/deeplinks';
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
  const mockHandleBrowserUrl = jest.fn();
  const mockHandleOpenHome = jest.fn();
  const mockHandleSwap = jest.fn();
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
    _handleBrowserUrl: mockHandleBrowserUrl,
    _handleOpenHome: mockHandleOpenHome,
    _handleSwap: mockHandleSwap,
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
    if ('onContinue' in callbackParams) {
      callbackParams.onContinue();
    } else {
      callbackParams.onBack();
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
      });

      expect(handled).toHaveBeenCalled();
      expect(mockHandleSellCrypto).toHaveBeenCalledTimes(1);
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
        });

        expect(handled).toHaveBeenCalled();
        expect(mockHandleBuyCrypto).toHaveBeenCalledWith(
          `${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.BUY_CRYPTO}/some-buy-path`,
        );
      });
    });
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
});

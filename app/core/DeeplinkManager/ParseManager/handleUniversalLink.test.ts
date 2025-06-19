import { Platform } from 'react-native';
import { ACTIONS } from '../../../constants/deeplinks';
import Device from '../../../util/device';
import AppConstants from '../../AppConstants';
import SDKConnect from '../../SDKConnect/SDKConnect';
import handleDeeplink from '../../SDKConnect/handlers/handleDeeplink';
import DevLogger from '../../SDKConnect/utils/DevLogger';
import WC2Manager from '../../WalletConnect/WalletConnectV2';
import DeeplinkManager from '../DeeplinkManager';
import extractURLParams from './extractURLParams';
import handleUniversalLink from './handleUniversalLink';
import Routes from '../../../constants/navigation/Routes';
import {
  verifyDeeplinkSignature,
  hasSignature,
  VALID,
  INVALID,
  MISSING,
} from './utils/verifySignature';
import handleDeepLinkModalDisplay from '../Handlers/handleDeepLinkModalDisplay';

jest.mock('../../../core/SDKConnect/handlers/handleDeeplink');
jest.mock('../../../core/AppConstants');
jest.mock('../../../core/SDKConnect/SDKConnect');
jest.mock('../../../core/WalletConnect/WalletConnectV2');
jest.mock('../../../core/NativeModules', () => ({
  Minimizer: {
    goBack: jest.fn(),
  },
}));
jest.mock('./utils/verifySignature');
jest.mock('../Handlers/handleDeepLinkModalDisplay');

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

  let params = {
    pubkey: '',
    uri: '',
    redirect: '',
    channelId: '',
    comm: '',
  } as ReturnType<typeof extractURLParams>['params'];

  const mockBrowserCallBack = jest.fn();
  let origin = '';
  let wcURL = '';
  let url = '';

  const mockHasSignature = hasSignature as jest.MockedFunction<
    typeof hasSignature
  >;
  const mockVerifyDeeplinkSignature =
    verifyDeeplinkSignature as jest.MockedFunction<
      typeof verifyDeeplinkSignature
    >;

  const mockHandleDeepLinkModalDisplay =
    handleDeepLinkModalDisplay as jest.MockedFunction<
      typeof handleDeepLinkModalDisplay
    >;

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

    params = {
      pubkey: '',
      uri: '',
      redirect: '',
      channelId: '',
      comm: '',
    };

    origin = 'test-origin';
    wcURL = 'test-wc-url';
    url = 'https://example.com';

    // Default mock implementation that resolves with true
    mockHandleDeepLinkModalDisplay.mockImplementation((params) => {
      if ('onContinue' in params) {
        params.onContinue();
      } else {
        params.onBack();
      }
    });
  });

  describe('ACTIONS.ANDROID_SDK', () => {
    it('calls bindAndroidSDK when action is ANDROID_SDK', async () => {
      DevLogger.log = jest.fn();

      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.ANDROID_SDK}/additional/path`,
      } as ReturnType<typeof extractURLParams>['urlObj'];

      await handleUniversalLink({
        instance,
        handled,
        urlObj,
        params,
        browserCallBack: mockBrowserCallBack,
        origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
        wcURL,
        url,
      });

      expect(handled).toHaveBeenCalled();
      expect(DevLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('android sdk universal link'),
      );
      expect(mockBindAndroidSDK).toHaveBeenCalled();
    });
  });

  describe('ACTIONS.CONNECT', () => {
    it('displays RETURN_TO_DAPP_MODAL', async () => {
      params.redirect = 'true';
      // Mock Device.isIos() to return true
      jest.spyOn(Device, 'isIos').mockReturnValue(true);

      // Set Platform.Version to '17' to ensure it's greater than 17
      Object.defineProperty(Platform, 'Version', { get: () => '17' });

      const mockNavigate = jest.fn();
      mockSDKConnectGetInstance.mockImplementation(() => ({
        state: {
          navigation: {
            navigate: mockNavigate,
          },
        },
      }));

      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.CONNECT}/additional/path`,
      } as ReturnType<typeof extractURLParams>['urlObj'];

      await handleUniversalLink({
        instance,
        handled,
        urlObj,
        params,
        browserCallBack: mockBrowserCallBack,
        origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
        wcURL,
        url,
      });

      expect(handled).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.RETURN_TO_DAPP_MODAL,
      });
    });
  });

  describe('ACTIONS.CONNECT with channelId and params.redirect is falsy', () => {
    beforeEach(() => {
      params.channelId = 'test-channel-id';
      params.redirect = '';
    });

    it('calls handleDeeplink', async () => {
      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.CONNECT}/additional/path`,
      } as ReturnType<typeof extractURLParams>['urlObj'];

      await handleUniversalLink({
        instance,
        handled,
        urlObj,
        params,
        browserCallBack: mockBrowserCallBack,
        origin,
        wcURL,
        url,
      });

      expect(handled).toHaveBeenCalled();
      expect(mockHandleDeeplink).toHaveBeenCalledWith({
        channelId: 'test-channel-id',
        origin: 'test-origin',
        context: 'deeplink_universal',
        url: 'https://example.com',
        protocolVersion: 1,
        otherPublicKey: '',
        sdkConnect: {
          getConnections: mockGetConnections,
          connectToChannel: mockConnectToChannel,
          revalidateChannel: mockRevalidateChannel,
          reconnect: mockReconnect,
          bindAndroidSDK: mockBindAndroidSDK,
        },
      });
    });
  });

  describe('ACTIONS.WC with wcURL', () => {
    it('calls WC2Manager.connect if action is WC and wcURL is truthy', async () => {
      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.WC}/additional/path`,
      } as ReturnType<typeof extractURLParams>['urlObj'];

      wcURL = 'test-wc-url';

      await handleUniversalLink({
        instance,
        handled,
        urlObj,
        params,
        browserCallBack: mockBrowserCallBack,
        origin,
        wcURL,
        url,
      });

      expect(handled).toHaveBeenCalled();
      expect(mockWC2ManagerGetInstance).toHaveBeenCalledTimes(1);
    });
  });

  describe('ACTIONS.WC without wcURL', () => {
    it('does not call WC2Manager.connect if action is WC and wcURL is falsy', async () => {
      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.WC}/additional/path`,
      } as ReturnType<typeof extractURLParams>['urlObj'];

      wcURL = '';

      await handleUniversalLink({
        instance,
        handled,
        urlObj,
        params,
        browserCallBack: mockBrowserCallBack,
        origin,
        wcURL,
        url,
      });

      expect(handled).toHaveBeenCalled();
      expect(mockWC2ManagerGetInstance).not.toHaveBeenCalled();
    });
  });

  describe('PREFIXES[action]', () => {
    it('calls instance.parse if PREFIXES[action] is truthy', async () => {
      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.SEND}/additional/path`,
        href: 'test-href',
      } as ReturnType<typeof extractURLParams>['urlObj'];

      await handleUniversalLink({
        instance,
        handled,
        urlObj,
        params,
        browserCallBack: mockBrowserCallBack,
        origin,
        wcURL,
        url,
      });

      expect(handled).toHaveBeenCalled();
      expect(mockParse).toHaveBeenCalledWith('test-href', {
        browserCallBack: mockBrowserCallBack,
        origin: 'test-origin',
      });
    });
  });

  describe('ACTIONS.BUY_CRYPTO', () => {
    it('calls instance._handleBuyCrypto if action is ACTIONS.BUY_CRYPTO', async () => {
      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.BUY_CRYPTO}/additional/path`,
        href: 'test-href',
      } as ReturnType<typeof extractURLParams>['urlObj'];

      await handleUniversalLink({
        instance,
        handled,
        urlObj,
        params,
        browserCallBack: mockBrowserCallBack,
        origin,
        wcURL,
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

      await handleUniversalLink({
        instance,
        handled,
        urlObj,
        params,
        browserCallBack: mockBrowserCallBack,
        origin,
        wcURL,
        url,
      });

      expect(handled).toHaveBeenCalled();
      expect(mockHandleSellCrypto).toHaveBeenCalledTimes(1);
    });
  });

  describe('default condition', () => {
    it('calls instance._handleBrowserUrl if action is not ACTIONS.BUY_CRYPTO or ACTIONS.SELL_CRYPTO', async () => {
      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/other-action/additional/path`,
        href: 'test-href',
      } as ReturnType<typeof extractURLParams>['urlObj'];

      await handleUniversalLink({
        instance,
        handled,
        urlObj,
        params,
        browserCallBack: mockBrowserCallBack,
        origin,
        wcURL,
        url,
      });

      expect(handled).toHaveBeenCalled();
      expect(mockHandleBrowserUrl).toHaveBeenCalledWith(
        'test-href',
        mockBrowserCallBack,
      );
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

        await handleUniversalLink({
          instance,
          handled,
          urlObj: homeUrlObj,
          params,
          browserCallBack: mockBrowserCallBack,
          origin,
          wcURL,
          url,
        });

        expect(handled).toHaveBeenCalled();
        expect(mockHandleOpenHome).toHaveBeenCalledTimes(1);
      });
    });

    describe('ACTIONS.SWAP', () => {
      it('calls _handleSwap with correct path of "swap" when action is SWAP', async () => {
        const swapUrl = `${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.SWAP}/some-swap-path`;
        const swapUrlObj = {
          ...urlObj,
          href: swapUrl,
          pathname: `/${ACTIONS.SWAP}/some-swap-path`,
        };

        await handleUniversalLink({
          instance,
          handled,
          urlObj: swapUrlObj,
          params,
          browserCallBack: mockBrowserCallBack,
          origin,
          wcURL,
          url,
        });

        expect(handled).toHaveBeenCalled();
        expect(mockHandleSwap).toHaveBeenCalledWith(
          `${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.SWAP}/some-swap-path`,
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

        await handleUniversalLink({
          instance,
          handled,
          urlObj: buyUrlObj,
          params,
          browserCallBack: mockBrowserCallBack,
          origin,
          wcURL,
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

        await handleUniversalLink({
          instance,
          handled,
          urlObj: buyUrlObj,
          params,
          browserCallBack: mockBrowserCallBack,
          origin,
          wcURL,
          url,
        });

        expect(handled).toHaveBeenCalled();
        expect(mockHandleBuyCrypto).toHaveBeenCalledWith(
          `${AppConstants.MM_UNIVERSAL_LINK_HOST}/${ACTIONS.BUY_CRYPTO}/some-buy-path`,
        );
      });
    });

    describe('default case', () => {
      it('navigates to home when action is not recognized', async () => {
        const unknownUrlObj = {
          ...urlObj,
          pathname: '/unknown-action/path',
        };

        await handleUniversalLink({
          instance,
          handled,
          urlObj: unknownUrlObj,
          params,
          browserCallBack: mockBrowserCallBack,
          origin,
          wcURL,
          url,
        });

        expect(handled).toHaveBeenCalled();
        expect(mockHandleOpenHome).toHaveBeenCalledTimes(1);
      });
    });
  });

  // TODO: Update these tests to work for handleUniversalLink
  // If you need to control if continue or back is called, look at re-mocking for each tests
  // mockHandleDeepLinkModalDisplay.mockImplementation((params) => {
  //   if ('onContinue' in params) {
  //     params.onContinue();
  //   } else {
  //     params.onBack();
  //   }
  // });
  // describe('signature verification', () => {
  //   it('should return true for valid signature', async () => {
  //     const url = 'https://example.com?param1=value1&sig=validSignature';
  //     mockHasSignature.mockReturnValue(true);
  //     mockVerifyDeeplinkSignature.mockResolvedValue(VALID);

  //     const result = await parseDeeplink({
  //       deeplinkManager: instance,
  //       url,
  //       origin: 'testOrigin',
  //       browserCallBack: mockBrowserCallBack,
  //       onHandled: mockOnHandled,
  //     });

  //     expect(result).toBe(true);
  //     expect(mockHasSignature).toHaveBeenCalled();
  //     expect(mockVerifyDeeplinkSignature).toHaveBeenCalled();
  //   });

  //   it('should return false for invalid signature', async () => {
  //     const url = 'https://example.com?param1=value1&sig=invalidSignature';
  //     mockHasSignature.mockReturnValue(true);
  //     mockVerifyDeeplinkSignature.mockResolvedValue(INVALID);

  //     const result = await parseDeeplink({
  //       deeplinkManager: instance,
  //       url,
  //       origin: 'testOrigin',
  //       browserCallBack: mockBrowserCallBack,
  //       onHandled: mockOnHandled,
  //     });

  //     expect(result).toBe(false);
  //     expect(mockHasSignature).toHaveBeenCalled();
  //     expect(mockVerifyDeeplinkSignature).toHaveBeenCalled();
  //   });

  //   it('should return false for missing signature', async () => {
  //     const url = 'https://example.com?param1=value1';
  //     mockHasSignature.mockReturnValue(true);
  //     mockVerifyDeeplinkSignature.mockResolvedValue(MISSING);

  //     const result = await parseDeeplink({
  //       deeplinkManager: instance,
  //       url,
  //       origin: 'testOrigin',
  //       browserCallBack: mockBrowserCallBack,
  //       onHandled: mockOnHandled,
  //     });

  //     expect(result).toBe(false);
  //     expect(mockHasSignature).toHaveBeenCalled();
  //     expect(mockVerifyDeeplinkSignature).toHaveBeenCalled();
  //   });

  //   it('should continue normal processing when no signature is present', async () => {
  //     const url = 'https://example.com?param1=value1';
  //     mockHasSignature.mockReturnValue(false);

  //     await parseDeeplink({
  //       deeplinkManager: instance,
  //       url,
  //       origin: 'testOrigin',
  //       browserCallBack: mockBrowserCallBack,
  //       onHandled: mockOnHandled,
  //     });

  //     expect(mockHasSignature).toHaveBeenCalled();
  //     expect(mockVerifyDeeplinkSignature).not.toHaveBeenCalled();
  //     expect(mockHandleUniversalLinks).toHaveBeenCalled();
  //   });
  // });
});

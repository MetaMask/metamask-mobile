import { ACTIONS } from '../../../constants/deeplinks';
import AppConstants from '../../AppConstants';
import { Minimizer } from '../../NativeModules';
import SDKConnect from '../../SDKConnect/SDKConnect';
import handleDeeplink from '../../SDKConnect/handlers/handleDeeplink';
import DevLogger from '../../SDKConnect/utils/DevLogger';
import WC2Manager from '../../WalletConnect/WalletConnectV2';
import DeeplinkManager from '../DeeplinkManager';
import extractURLParams from './extractURLParams';
import handleUniversalLink from './handleUniversalLink';

jest.mock('../../../core/SDKConnect/handlers/handleDeeplink');
jest.mock('../../../core/AppConstants');
jest.mock('../../../core/SDKConnect/SDKConnect');
jest.mock('../../../core/WalletConnect/WalletConnectV2');
jest.mock('../../../core/NativeModules', () => ({
  Minimizer: {
    goBack: jest.fn(),
  },
}));

describe('handleUniversalLinks', () => {
  const mockParse = jest.fn();
  const mockHandleBuyCrypto = jest.fn();
  const mockHandleSellCrypto = jest.fn();
  const mockHandleBrowserUrl = jest.fn();
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
    url = 'test-url';
  });

  describe('ACTIONS.ANDROID_SDK', () => {
    it('should call bindAndroidSDK when action is ANDROID_SDK', () => {
      DevLogger.log = jest.fn();

      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.ANDROID_SDK}/additional/path`,
      } as ReturnType<typeof extractURLParams>['urlObj'];

      handleUniversalLink({
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
      expect(DevLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('android sdk universal link'),
      );
      expect(mockBindAndroidSDK).toHaveBeenCalled();
    });
  });

  describe('ACTIONS.CONNECT', () => {
    it('should call Minimizer.goBack if params.redirect is truthy', () => {
      params.redirect = 'ABC';

      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.CONNECT}/additional/path`,
      } as ReturnType<typeof extractURLParams>['urlObj'];

      handleUniversalLink({
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
      expect(Minimizer.goBack).toHaveBeenCalled();
    });

    it('should NOT call Minimizer.goBack if params.redirect is falsy', () => {
      params.redirect = '';

      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.CONNECT}/additional/path`,
      } as ReturnType<typeof extractURLParams>['urlObj'];

      handleUniversalLink({
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
      expect(Minimizer.goBack).not.toHaveBeenCalled();
    });
  });

  describe('ACTIONS.CONNECT with channelId and params.redirect is falsy', () => {
    beforeEach(() => {
      params.channelId = 'test-channel-id';
      params.redirect = '';
    });

    it('should call handleDeeplink', () => {
      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.CONNECT}/additional/path`,
      } as ReturnType<typeof extractURLParams>['urlObj'];

      handleUniversalLink({
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
        url: 'test-url',
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
    it('should call WC2Manager.connect if action is WC and wcURL is truthy', () => {
      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.WC}/additional/path`,
      } as ReturnType<typeof extractURLParams>['urlObj'];

      wcURL = 'test-wc-url';

      handleUniversalLink({
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
    it('should not call WC2Manager.connect if action is WC and wcURL is falsy', () => {
      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.WC}/additional/path`,
      } as ReturnType<typeof extractURLParams>['urlObj'];

      wcURL = '';

      handleUniversalLink({
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
    it('should call instance.parse if PREFIXES[action] is truthy', () => {
      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.SEND}/additional/path`,
        href: 'test-href',
      } as ReturnType<typeof extractURLParams>['urlObj'];

      handleUniversalLink({
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
    it('should call instance._handleBuyCrypto if action is ACTIONS.BUY_CRYPTO', () => {
      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.BUY_CRYPTO}/additional/path`,
        href: 'test-href',
      } as ReturnType<typeof extractURLParams>['urlObj'];

      handleUniversalLink({
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
    it('should call instance._handleSellCrypto if action is ACTIONS.SELL_CRYPTO', () => {
      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.SELL_CRYPTO}/additional/path`,
        href: 'test-href',
      } as ReturnType<typeof extractURLParams>['urlObj'];

      handleUniversalLink({
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
    it('should call instance._handleBrowserUrl if action is not ACTIONS.BUY_CRYPTO or ACTIONS.SELL_CRYPTO', () => {
      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/other-action/additional/path`,
        href: 'test-href',
      } as ReturnType<typeof extractURLParams>['urlObj'];

      handleUniversalLink({
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
});

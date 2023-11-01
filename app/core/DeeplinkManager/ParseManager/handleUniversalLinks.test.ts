import { ACTIONS } from '../../../constants/deeplinks';
import AppConstants from '../../../core/AppConstants';
import { Minimizer } from '../../../core/NativeModules';
import SDKConnect, {
  DEFAULT_SESSION_TIMEOUT_MS,
} from '../../../core/SDKConnect/SDKConnect';
import DevLogger from '../../../core/SDKConnect/utils/DevLogger';
import WC2Manager from '../../../core/WalletConnect/WalletConnectV2';
import DeeplinkManager from '../DeeplinkManager';
import extractURLParams from './extractURLParams';
import handleUniversalLinks from './handleUniversalLinks';

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
  const mockHandleBrowserUrl = jest.fn();
  const mockConnectToChannel = jest.fn();
  const mockGetConnections = jest.fn();
  const mockRevalidateChannel = jest.fn();
  const mockReconnect = jest.fn();
  const mockWC2ManagerConnect = jest.fn();

  const mockSDKConnectGetInstance = SDKConnect.getInstance as jest.Mock;
  const mockWC2ManagerGetInstance = WC2Manager.getInstance as jest.Mock;

  const instance = {
    parse: mockParse,
    _handleBuyCrypto: mockHandleBuyCrypto,
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

  beforeEach(() => {
    jest.clearAllMocks();

    mockSDKConnectGetInstance.mockImplementation(() => ({
      getConnections: mockGetConnections,
      connectToChannel: mockConnectToChannel,
      revalidateChannel: mockRevalidateChannel,
      reconnect: mockReconnect,
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
  });

  describe('ACTIONS.ANDROID_SDK', () => {
    it('should call bindAndroidSDK when action is ANDROID_SDK', () => {
      const mockSDKConnectInstance = {
        bindAndroidSDK: jest.fn(),
      };

      mockSDKConnectGetInstance.mockImplementation(
        () => mockSDKConnectInstance,
      );
      DevLogger.log = jest.fn();

      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.ANDROID_SDK}/additional/path`,
      } as ReturnType<typeof extractURLParams>['urlObj'];

      handleUniversalLinks({
        instance,
        handled,
        urlObj,
        params,
        browserCallBack: mockBrowserCallBack,
        origin,
        wcURL,
      });

      expect(handled).toHaveBeenCalled();
      expect(DevLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('android sdk universal link'),
      );
      expect(mockSDKConnectInstance.bindAndroidSDK).toHaveBeenCalled();
    });
  });

  describe('ACTIONS.CONNECT', () => {
    it('should call Minimizer.goBack if params.redirect is truthy', () => {
      params.redirect = 'ABC';

      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.CONNECT}/additional/path`,
      } as ReturnType<typeof extractURLParams>['urlObj'];

      handleUniversalLinks({
        instance,
        handled,
        urlObj,
        params,
        browserCallBack: mockBrowserCallBack,
        origin,
        wcURL,
      });

      expect(handled).toHaveBeenCalled();
      expect(Minimizer.goBack).toHaveBeenCalled();
    });
  });

  describe('ACTIONS.CONNECT with channelId', () => {
    it('should revalidate channel if it already exists and origin is ORIGIN_DEEPLINK', () => {
      params.channelId = 'existingChannel';
      origin = AppConstants.DEEPLINKS.ORIGIN_DEEPLINK;

      mockGetConnections.mockReturnValue({
        existingChannel: 'existing-channel',
      });

      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.CONNECT}/additional/path`,
      } as ReturnType<typeof extractURLParams>['urlObj'];

      handleUniversalLinks({
        instance,
        handled,
        urlObj,
        params,
        browserCallBack: mockBrowserCallBack,
        origin,
        wcURL,
      });

      expect(handled).toHaveBeenCalled();
      expect(mockRevalidateChannel).toHaveBeenCalledWith({
        channelId: params.channelId,
      });
    });

    it('should reconnect if the channel exists and origin is not ORIGIN_DEEPLINK', () => {
      params.channelId = 'existingChannel';
      origin = 'other-origin';

      mockGetConnections.mockReturnValue({
        existingChannel: 'existing-channel',
      });

      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.CONNECT}/additional/path`,
      } as ReturnType<typeof extractURLParams>['urlObj'];

      handleUniversalLinks({
        instance,
        handled,
        urlObj,
        params,
        browserCallBack: mockBrowserCallBack,
        origin,
        wcURL,
      });

      expect(handled).toHaveBeenCalled();
      expect(mockReconnect).toHaveBeenCalledWith({
        channelId: params.channelId,
        otherPublicKey: params.pubkey,
        context: 'deeplink (universal)',
        initialConnection: false,
      });
    });
    it('should connect to a new channel if the channel ID does not exist', () => {
      params.channelId = 'newChannel';
      origin = 'other-origin';

      mockGetConnections.mockReturnValue({
        existingChannel: 'existing-channel',
      });

      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/${ACTIONS.CONNECT}/additional/path`,
      } as ReturnType<typeof extractURLParams>['urlObj'];

      handleUniversalLinks({
        instance,
        handled,
        urlObj,
        params,
        browserCallBack: mockBrowserCallBack,
        origin,
        wcURL,
      });

      expect(handled).toHaveBeenCalled();
      expect(mockConnectToChannel).toHaveBeenCalledWith({
        id: params.channelId,
        otherPublicKey: params.pubkey,
        validUntil: Date.now() + DEFAULT_SESSION_TIMEOUT_MS,
        origin: 'other-origin',
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

      handleUniversalLinks({
        instance,
        handled,
        urlObj,
        params,
        browserCallBack: mockBrowserCallBack,
        origin,
        wcURL,
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

      handleUniversalLinks({
        instance,
        handled,
        urlObj,
        params,
        browserCallBack: mockBrowserCallBack,
        origin,
        wcURL,
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

      handleUniversalLinks({
        instance,
        handled,
        urlObj,
        params,
        browserCallBack: mockBrowserCallBack,
        origin,
        wcURL,
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

      handleUniversalLinks({
        instance,
        handled,
        urlObj,
        params,
        browserCallBack: mockBrowserCallBack,
        origin,
        wcURL,
      });

      expect(handled).toHaveBeenCalled();
      expect(mockHandleBuyCrypto).toHaveBeenCalledTimes(1);
    });
  });

  describe('default condition', () => {
    it('should call instance._handleBrowserUrl if action is not ACTIONS.BUY_CRYPTO', () => {
      urlObj = {
        hostname: AppConstants.MM_UNIVERSAL_LINK_HOST,
        pathname: `/other-action/additional/path`,
        href: 'test-href',
      } as ReturnType<typeof extractURLParams>['urlObj'];

      handleUniversalLinks({
        instance,
        handled,
        urlObj,
        params,
        browserCallBack: mockBrowserCallBack,
        origin,
        wcURL,
      });

      expect(handled).toHaveBeenCalled();
      expect(mockHandleBrowserUrl).toHaveBeenCalledWith(
        'test-href',
        mockBrowserCallBack,
      );
    });
  });
});

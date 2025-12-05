import { Platform } from 'react-native';
import { ACTIONS, PREFIXES } from '../../../../../constants/deeplinks';
import Routes from '../../../../../constants/navigation/Routes';
import Device from '../../../../../util/device';
import AppConstants from '../../../../AppConstants';
import handleDeeplink from '../../../../SDKConnect/handlers/handleDeeplink';
import SDKConnect from '../../../../SDKConnect/SDKConnect';
import WC2Manager from '../../../../WalletConnect/WalletConnectV2';
import DeeplinkManager from '../../../DeeplinkManager';
import extractURLParams from '../../../utils/extractURLParams';
import handleMetaMaskDeeplink from '../handleMetaMaskDeeplink';
import handleRampUrl from '../handleRampUrl';
import handleDepositCashUrl from '../handleDepositCashUrl';

jest.mock('../../../../AppConstants');
jest.mock('../../../../SDKConnect/handlers/handleDeeplink');
jest.mock('../../../../SDKConnect/SDKConnect');
jest.mock('../../../../WalletConnect/WalletConnectV2');
jest.mock('../handleRampUrl');
jest.mock('../handleDepositCashUrl');
jest.mock('../../../../NativeModules', () => ({
  Minimizer: {
    goBack: jest.fn(),
  },
}));

describe('handleMetaMaskProtocol', () => {
  const mockParse = jest.fn();
  const mockConnectToChannel = jest.fn();
  const mockGetConnections = jest.fn();
  const mockRevalidateChannel = jest.fn();
  const mockReconnect = jest.fn();
  const mockWC2ManagerConnect = jest.fn();
  const mockGetApprovedHosts = jest.fn();
  const mockBindAndroidSDK = jest.fn();
  const mockNavigate = jest.fn();

  const mockHandleDeeplink = handleDeeplink as jest.Mock;
  const mockSDKConnectGetInstance = SDKConnect.getInstance as jest.Mock;
  const mockWC2ManagerGetInstance = WC2Manager.getInstance as jest.Mock;
  const mockHandleRampUrl = handleRampUrl as jest.MockedFunction<
    typeof handleRampUrl
  >;
  const mockHandleDepositCashUrl = handleDepositCashUrl as jest.MockedFunction<
    typeof handleDepositCashUrl
  >;

  const instance = {
    parse: mockParse,
    navigation: mockNavigate,
  } as unknown as DeeplinkManager;

  const handled = jest.fn();

  let url = '';

  let params = {
    pubkey: '',
    uri: '',
    redirect: '',
    channelId: '',
    comm: '',
    hr: false,
  } as ReturnType<typeof extractURLParams>['params'];

  let origin = '';
  let wcURL = '';

  beforeEach(() => {
    jest.clearAllMocks();

    mockBindAndroidSDK.mockResolvedValue(undefined);
    mockHandleDeeplink.mockResolvedValue(undefined);

    mockSDKConnectGetInstance.mockImplementation(() => ({
      getConnections: mockGetConnections,
      connectToChannel: mockConnectToChannel,
      revalidateChannel: mockRevalidateChannel,
      reconnect: mockReconnect,
      getApprovedHosts: mockGetApprovedHosts,
      bindAndroidSDK: mockBindAndroidSDK,
      state: {
        navigation: {
          navigate: mockNavigate,
        },
      },
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
      hr: false,
    };

    origin = 'test-origin';
    wcURL = 'test-wc-url';
    url = '';
  });

  it('should call handled', () => {
    handleMetaMaskDeeplink({
      instance,
      handled,
      params,
      url,
      origin,
      wcURL,
    });

    expect(handled).toHaveBeenCalled();
  });

  describe('when url starts with ${PREFIXES.METAMASK}${ACTIONS.ANDROID_SDK}', () => {
    beforeEach(() => {
      url = `${PREFIXES.METAMASK}${ACTIONS.ANDROID_SDK}`;
    });

    it('should call bindAndroidSDK', () => {
      handleMetaMaskDeeplink({
        instance,
        handled,
        params,
        url,
        origin,
        wcURL,
      });

      expect(mockBindAndroidSDK).toHaveBeenCalled();
    });
  });

  describe('when params.comm is "deeplinking"', () => {
    beforeEach(() => {
      url = `${PREFIXES.METAMASK}${ACTIONS.CONNECT}`;
      params.comm = 'deeplinking';
      params.channelId = 'test-channel-id';
      params.pubkey = 'test-pubkey';
      params.originatorInfo = 'test-originator-info';
      params.request = 'test-request';
    });

    it('should throw an error if params.scheme is not defined', () => {
      params.scheme = undefined;

      expect(() => {
        handleMetaMaskDeeplink({
          instance,
          handled,
          params,
          url,
          origin,
          wcURL,
        });
      }).toThrow('DeepLinkManager failed to connect - Invalid scheme');
    });

    it('should call handleConnection if params.scheme is defined', () => {
      const mockHandleConnection = jest.fn();
      mockSDKConnectGetInstance.mockImplementation(() => ({
        state: {
          deeplinkingService: {
            handleConnection: mockHandleConnection,
          },
        },
      }));

      params.scheme = 'test-scheme';

      handleMetaMaskDeeplink({
        instance,
        handled,
        params,
        url,
        origin,
        wcURL,
      });

      expect(mockHandleConnection).toHaveBeenCalledWith({
        channelId: params.channelId,
        url,
        scheme: params.scheme,
        dappPublicKey: params.pubkey,
        originatorInfo: params.originatorInfo,
        request: params.request,
      });
    });
  });

  describe('when url starts with ${PREFIXES.METAMASK}${ACTIONS.MMSDK}', () => {
    beforeEach(() => {
      url = `${PREFIXES.METAMASK}${ACTIONS.MMSDK}`;
      params.channelId = 'test-channel-id';
      params.pubkey = 'test-pubkey';
      params.account = 'test-account';
    });

    it('should throw an error if params.message is not defined', () => {
      params.message = undefined;

      expect(() => {
        handleMetaMaskDeeplink({
          instance,
          handled,
          params,
          url,
          origin,
          wcURL,
        });
      }).toThrow(
        'DeepLinkManager: deeplinkingService failed to handleMessage - Invalid message',
      );
    });

    it('should throw an error if params.scheme is not defined', () => {
      params.message = 'test-message';
      params.scheme = undefined;

      expect(() => {
        handleMetaMaskDeeplink({
          instance,
          handled,
          params,
          url,
          origin,
          wcURL,
        });
      }).toThrow(
        'DeepLinkManager: deeplinkingService failed to handleMessage - Invalid scheme',
      );
    });

    it('should call handleMessage if params.message and params.scheme are defined', () => {
      const mockHandleMessage = jest.fn();
      mockSDKConnectGetInstance.mockImplementation(() => ({
        state: {
          deeplinkingService: {
            handleMessage: mockHandleMessage,
          },
        },
      }));

      params.message = 'test-message';
      params.scheme = 'test-scheme';

      handleMetaMaskDeeplink({
        instance,
        handled,
        params,
        url,
        origin,
        wcURL,
      });

      expect(mockHandleMessage).toHaveBeenCalledWith({
        channelId: params.channelId,
        url,
        message: params.message,
        dappPublicKey: params.pubkey,
        scheme: params.scheme,
        account: params.account ?? '@',
      });
    });
  });

  describe('when url starts with ${PREFIXES.METAMASK}${ACTIONS.CONNECT}', () => {
    beforeEach(() => {
      url = `${PREFIXES.METAMASK}${ACTIONS.CONNECT}`;
    });

    it('should displays RETURN_TO_DAPP_NOTIFICATION', () => {
      params.redirect = 'true';
      // Mock Device.isIos() to return true
      jest.spyOn(Device, 'isIos').mockReturnValue(true);

      // Set Platform.Version to '16' to ensure it's less than 17
      Object.defineProperty(Platform, 'Version', { get: () => '17' });

      handleMetaMaskDeeplink({
        instance,
        handled,
        params,
        origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
        wcURL,
        url,
      });

      expect(handled).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SDK.RETURN_TO_DAPP_NOTIFICATION,
        hideReturnToApp: false,
      });
    });

    it('should displays RETURN_TO_DAPP_NOTIFICATION with hideReturnToApp set to true', () => {
      params.redirect = 'true';
      params.hr = true;
      // Mock Device.isIos() to return true
      jest.spyOn(Device, 'isIos').mockReturnValue(true);

      // Set Platform.Version to '16' to ensure it's less than 17
      Object.defineProperty(Platform, 'Version', { get: () => '17' });

      handleMetaMaskDeeplink({
        instance,
        handled,
        params,
        origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
        wcURL,
        url,
      });

      expect(handled).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SDK.RETURN_TO_DAPP_NOTIFICATION,
        hideReturnToApp: true,
      });
    });

    it('should displays RETURN_TO_DAPP_NOTIFICATION with hideReturnToApp set to false', () => {
      params.redirect = 'true';
      params.hr = false;
      // Mock Device.isIos() to return true
      jest.spyOn(Device, 'isIos').mockReturnValue(true);

      // Set Platform.Version to '16' to ensure it's less than 17
      Object.defineProperty(Platform, 'Version', { get: () => '17' });

      handleMetaMaskDeeplink({
        instance,
        handled,
        params,
        origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
        wcURL,
        url,
      });

      expect(handled).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SDK.RETURN_TO_DAPP_NOTIFICATION,
        hideReturnToApp: false,
      });
    });

    it('should call handleDeeplink when channel exists and params.redirect is falsy', () => {
      origin = AppConstants.DEEPLINKS.ORIGIN_DEEPLINK;
      params.channelId = 'ABC';
      params.redirect = '';
      mockGetApprovedHosts.mockReturnValue({ ABC: true });

      handleMetaMaskDeeplink({
        instance,
        handled,
        params,
        url,
        origin,
        wcURL,
      });

      expect(mockHandleDeeplink).toHaveBeenCalledWith({
        channelId: params.channelId,
        origin,
        url,
        context: 'deeplink_scheme',
        otherPublicKey: params.pubkey,
        protocolVersion: 1,
        originatorInfo: undefined,
        rpc: undefined,
        hideReturnToApp: false,
        sdkConnect: {
          getConnections: mockGetConnections,
          connectToChannel: mockConnectToChannel,
          revalidateChannel: mockRevalidateChannel,
          reconnect: mockReconnect,
          getApprovedHosts: mockGetApprovedHosts,
          bindAndroidSDK: mockBindAndroidSDK,
          state: {
            navigation: {
              navigate: mockNavigate,
            },
          },
        },
      });
    });

    it('should call handleDeeplink with hideReturnToApp set to true', () => {
      origin = AppConstants.DEEPLINKS.ORIGIN_DEEPLINK;
      params.channelId = 'ABC';
      params.redirect = '';
      params.hr = true;
      mockGetApprovedHosts.mockReturnValue({ ABC: true });

      handleMetaMaskDeeplink({
        instance,
        handled,
        params,
        url,
        origin,
        wcURL,
      });

      expect(mockHandleDeeplink).toHaveBeenCalledWith({
        channelId: params.channelId,
        origin,
        url,
        context: 'deeplink_scheme',
        otherPublicKey: params.pubkey,
        protocolVersion: 1,
        originatorInfo: undefined,
        rpc: undefined,
        hideReturnToApp: true,
        sdkConnect: {
          getConnections: mockGetConnections,
          connectToChannel: mockConnectToChannel,
          revalidateChannel: mockRevalidateChannel,
          reconnect: mockReconnect,
          getApprovedHosts: mockGetApprovedHosts,
          bindAndroidSDK: mockBindAndroidSDK,
          state: {
            navigation: {
              navigate: mockNavigate,
            },
          },
        },
      });
    });

    it('should call handleDeeplink with hideReturnToApp set to false', () => {
      origin = AppConstants.DEEPLINKS.ORIGIN_DEEPLINK;
      params.channelId = 'ABC';
      params.redirect = '';
      params.hr = false;
      mockGetApprovedHosts.mockReturnValue({ ABC: true });

      handleMetaMaskDeeplink({
        instance,
        handled,
        params,
        url,
        origin,
        wcURL,
      });

      expect(mockHandleDeeplink).toHaveBeenCalledWith({
        channelId: params.channelId,
        origin,
        url,
        context: 'deeplink_scheme',
        otherPublicKey: params.pubkey,
        protocolVersion: 1,
        originatorInfo: undefined,
        rpc: undefined,
        hideReturnToApp: false,
        sdkConnect: {
          getConnections: mockGetConnections,
          connectToChannel: mockConnectToChannel,
          revalidateChannel: mockRevalidateChannel,
          reconnect: mockReconnect,
          getApprovedHosts: mockGetApprovedHosts,
          bindAndroidSDK: mockBindAndroidSDK,
          state: {
            navigation: {
              navigate: mockNavigate,
            },
          },
        },
      });
    });
  });

  describe('when url start with ${PREFIXES.METAMASK}${ACTIONS.WC} or with ${PREFIXES.METAMASK}/${ACTIONS.WC}', () => {
    beforeEach(() => {
      const urls = [
        `${PREFIXES.METAMASK}${ACTIONS.WC}`,
        `${PREFIXES.METAMASK}/${ACTIONS.WC}`,
      ];

      const randomIndex = Math.floor(Math.random() * urls.length);

      url = urls[randomIndex];
    });

    it('should call WC2Manager.getInstance().connect', () => {
      handleMetaMaskDeeplink({
        instance,
        handled,
        params,
        url,
        origin,
        wcURL,
      });

      expect(mockWC2ManagerGetInstance).toHaveBeenCalledTimes(1);
    });
  });

  describe('when url start with ${PREFIXES.METAMASK}${ACTIONS.BUY_CRYPTO}', () => {
    beforeEach(() => {
      url = `${PREFIXES.METAMASK}${ACTIONS.BUY_CRYPTO}`;
    });

    it('calls handleRampUrl with BUY type', () => {
      handleMetaMaskDeeplink({
        instance,
        handled,
        params,
        url,
        origin,
        wcURL,
      });

      expect(mockHandleRampUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          navigation: mockNavigate,
          rampType: expect.any(String), // RampType.BUY
        }),
      );
    });
  });

  describe('when url start with ${PREFIXES.METAMASK}${ACTIONS.SELL_CRYPTO}', () => {
    beforeEach(() => {
      url = `${PREFIXES.METAMASK}${ACTIONS.SELL_CRYPTO}`;
    });

    it('calls handleRampUrl with SELL type', () => {
      handleMetaMaskDeeplink({
        instance,
        handled,
        params,
        url,
        origin,
        wcURL,
      });

      expect(mockHandleRampUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          navigation: mockNavigate,
          rampType: expect.any(String), // RampType.SELL
        }),
      );
    });
  });

  describe('when url start with ${PREFIXES.METAMASK}${ACTIONS.DEPOSIT}', () => {
    beforeEach(() => {
      url = `${PREFIXES.METAMASK}${ACTIONS.DEPOSIT}`;
    });

    it('calls handleDepositCashUrl', () => {
      handleMetaMaskDeeplink({
        instance,
        handled,
        params,
        url,
        origin,
        wcURL,
      });

      expect(mockHandleDepositCashUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          navigation: mockNavigate,
        }),
      );
    });
  });
});

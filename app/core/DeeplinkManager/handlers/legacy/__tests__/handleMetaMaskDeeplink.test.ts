import { Platform } from 'react-native';
import { ACTIONS, PREFIXES } from '../../../../../constants/deeplinks';
import Routes from '../../../../../constants/navigation/Routes';
import Device from '../../../../../util/device';
import AppConstants from '../../../../AppConstants';
import handleDeeplink from '../../../../SDKConnect/handlers/handleDeeplink';
import SDKConnect from '../../../../SDKConnect/SDKConnect';
import WC2Manager from '../../../../WalletConnect/WalletConnectV2';
import extractURLParams from '../../../utils/extractURLParams';
import handleMetaMaskDeeplink from '../handleMetaMaskDeeplink';
import handleRampUrl from '../handleRampUrl';

jest.mock('../../../../AppConstants');
jest.mock('../../../../SDKConnect/handlers/handleDeeplink');
jest.mock('../../../../SDKConnect/SDKConnect');
jest.mock('../../../../WalletConnect/WalletConnectV2');
jest.mock('../handleRampUrl');
jest.mock('../../../../NativeModules', () => ({
  Minimizer: {
    goBack: jest.fn(),
  },
}));

describe('handleMetaMaskProtocol', () => {
  const mockGetApprovedHosts = jest.fn();
  const mockBindAndroidSDK = jest.fn();
  const mockNavigate = jest.fn();

  const mockHandleDeeplink = handleDeeplink as jest.Mock;
  const mockSDKConnectInit = SDKConnect.init as jest.Mock;
  const mockSDKConnectGetInstance = SDKConnect.getInstance as jest.Mock;
  const mockWC2ManagerGetInstance = WC2Manager.getInstance as jest.Mock;
  const mockHandleRampUrl = handleRampUrl as jest.MockedFunction<
    typeof handleRampUrl
  >;

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
    mockSDKConnectInit.mockResolvedValue(undefined);

    mockSDKConnectGetInstance.mockImplementation(() => ({
      getConnections: jest.fn(),
      connectToChannel: jest.fn(),
      revalidateChannel: jest.fn(),
      reconnect: jest.fn(),
      getApprovedHosts: mockGetApprovedHosts,
      bindAndroidSDK: mockBindAndroidSDK,
      state: {
        navigation: {
          navigate: mockNavigate,
        },
      },
    }));

    mockWC2ManagerGetInstance.mockResolvedValue({
      connect: jest.fn(),
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

  it('calls handled', async () => {
    await handleMetaMaskDeeplink({
      handled,
      params,
      url,
      origin,
      wcURL,
    });

    expect(handled).toHaveBeenCalled();
  });

  it('awaits SDKConnect.init so connect/mmsdk branches cannot race init', async () => {
    // Simulate SDKConnect init still in-flight: resolve SDKConnect.init
    // only when we manually trigger it. The handler must await this before
    // reaching the deeplinkingService call below.
    let resolveInit: () => void = () => undefined;
    mockSDKConnectInit.mockImplementation(
      () => new Promise<void>((resolve) => (resolveInit = resolve)),
    );
    const mockHandleMessage = jest.fn();
    mockSDKConnectGetInstance.mockImplementation(() => ({
      state: {
        deeplinkingService: {
          handleMessage: mockHandleMessage,
        },
      },
    }));

    url = `${PREFIXES.METAMASK}${ACTIONS.MMSDK}`;
    params.message = 'test-message';
    params.scheme = 'test-scheme';
    params.channelId = 'test-channel-id';

    const handlerPromise = handleMetaMaskDeeplink({
      handled,
      params,
      url,
      origin,
      wcURL,
    });

    // Microtask drain — with init still pending, handleMessage must not fire.
    await Promise.resolve();
    expect(mockHandleMessage).not.toHaveBeenCalled();

    // Unblock init — the handler continues and reaches deeplinkingService.
    resolveInit();
    await handlerPromise;
    expect(mockSDKConnectInit).toHaveBeenCalledWith({ context: 'deeplink' });
    expect(mockHandleMessage).toHaveBeenCalled();
  });

  it('still reaches the branch handlers if SDKConnect.init rejects', async () => {
    mockSDKConnectInit.mockRejectedValue(new Error('init boom'));
    url = `${PREFIXES.METAMASK}${ACTIONS.WC}`;

    await handleMetaMaskDeeplink({
      handled,
      params,
      url,
      origin,
      wcURL,
    });

    // WC branch still runs even when SDKConnect init fails, since WC doesn't
    // depend on SDKConnect.
    expect(mockWC2ManagerGetInstance).toHaveBeenCalledTimes(1);
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

    it('throws an error if params.scheme is not defined', async () => {
      params.scheme = undefined;

      await expect(
        handleMetaMaskDeeplink({
          handled,
          params,
          url,
          origin,
          wcURL,
        }),
      ).rejects.toThrow('DeepLinkManager failed to connect - Invalid scheme');
    });

    it('calls handleConnection if params.scheme is defined', async () => {
      const mockHandleConnection = jest.fn();
      mockSDKConnectGetInstance.mockImplementation(() => ({
        state: {
          deeplinkingService: {
            handleConnection: mockHandleConnection,
          },
        },
      }));

      params.scheme = 'test-scheme';

      await handleMetaMaskDeeplink({
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

    it('throws an error if params.message is not defined', async () => {
      params.message = undefined;

      await expect(
        handleMetaMaskDeeplink({
          handled,
          params,
          url,
          origin,
          wcURL,
        }),
      ).rejects.toThrow(
        'DeepLinkManager: deeplinkingService failed to handleMessage - Invalid message',
      );
    });

    it('throws an error if params.scheme is not defined', async () => {
      params.message = 'test-message';
      params.scheme = undefined;

      await expect(
        handleMetaMaskDeeplink({
          handled,
          params,
          url,
          origin,
          wcURL,
        }),
      ).rejects.toThrow(
        'DeepLinkManager: deeplinkingService failed to handleMessage - Invalid scheme',
      );
    });

    it('calls handleMessage if params.message and params.scheme are defined', async () => {
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

      await handleMetaMaskDeeplink({
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

    it('displays RETURN_TO_DAPP_NOTIFICATION', async () => {
      params.redirect = 'true';
      // Mock Device.isIos() to return true
      jest.spyOn(Device, 'isIos').mockReturnValue(true);

      // Set Platform.Version to '16' to ensure it's less than 17
      Object.defineProperty(Platform, 'Version', { get: () => '17' });

      await handleMetaMaskDeeplink({
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

    it('displays RETURN_TO_DAPP_NOTIFICATION with hideReturnToApp set to true', async () => {
      params.redirect = 'true';
      params.hr = true;
      // Mock Device.isIos() to return true
      jest.spyOn(Device, 'isIos').mockReturnValue(true);

      // Set Platform.Version to '16' to ensure it's less than 17
      Object.defineProperty(Platform, 'Version', { get: () => '17' });

      await handleMetaMaskDeeplink({
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

    it('displays RETURN_TO_DAPP_NOTIFICATION with hideReturnToApp set to false', async () => {
      params.redirect = 'true';
      params.hr = false;
      // Mock Device.isIos() to return true
      jest.spyOn(Device, 'isIos').mockReturnValue(true);

      // Set Platform.Version to '16' to ensure it's less than 17
      Object.defineProperty(Platform, 'Version', { get: () => '17' });

      await handleMetaMaskDeeplink({
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

    it('calls handleDeeplink when channel exists and params.redirect is falsy', async () => {
      origin = AppConstants.DEEPLINKS.ORIGIN_DEEPLINK;
      params.channelId = 'ABC';
      params.redirect = '';
      mockGetApprovedHosts.mockReturnValue({ ABC: true });

      await handleMetaMaskDeeplink({
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
        sdkConnect: expect.objectContaining({
          getApprovedHosts: mockGetApprovedHosts,
          bindAndroidSDK: mockBindAndroidSDK,
          state: {
            navigation: {
              navigate: mockNavigate,
            },
          },
        }),
      });
    });

    it('calls handleDeeplink with hideReturnToApp set to true', async () => {
      origin = AppConstants.DEEPLINKS.ORIGIN_DEEPLINK;
      params.channelId = 'ABC';
      params.redirect = '';
      params.hr = true;
      mockGetApprovedHosts.mockReturnValue({ ABC: true });

      await handleMetaMaskDeeplink({
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
        sdkConnect: expect.objectContaining({
          getApprovedHosts: mockGetApprovedHosts,
          bindAndroidSDK: mockBindAndroidSDK,
          state: {
            navigation: {
              navigate: mockNavigate,
            },
          },
        }),
      });
    });

    it('calls handleDeeplink with hideReturnToApp set to false', async () => {
      origin = AppConstants.DEEPLINKS.ORIGIN_DEEPLINK;
      params.channelId = 'ABC';
      params.redirect = '';
      params.hr = false;
      mockGetApprovedHosts.mockReturnValue({ ABC: true });

      await handleMetaMaskDeeplink({
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
        sdkConnect: expect.objectContaining({
          getApprovedHosts: mockGetApprovedHosts,
          bindAndroidSDK: mockBindAndroidSDK,
          state: {
            navigation: {
              navigate: mockNavigate,
            },
          },
        }),
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

    it('calls WC2Manager.getInstance().connect', async () => {
      await handleMetaMaskDeeplink({
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

    it('calls handleRampUrl with BUY type', async () => {
      await handleMetaMaskDeeplink({
        handled,
        params,
        url,
        origin,
        wcURL,
      });

      expect(mockHandleRampUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          rampType: expect.any(String), // RampType.BUY
        }),
      );
    });
  });

  describe('when url start with ${PREFIXES.METAMASK}${ACTIONS.SELL_CRYPTO}', () => {
    beforeEach(() => {
      url = `${PREFIXES.METAMASK}${ACTIONS.SELL_CRYPTO}`;
    });

    it('calls handleRampUrl with SELL type', async () => {
      await handleMetaMaskDeeplink({
        handled,
        params,
        url,
        origin,
        wcURL,
      });

      expect(mockHandleRampUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          rampType: expect.any(String), // RampType.SELL
        }),
      );
    });
  });

  describe('when url starts with deprecated deposit scheme', () => {
    beforeEach(() => {
      url = `${PREFIXES.METAMASK}${ACTIONS.DEPOSIT}`;
    });

    it('does not invoke ramp or deposit navigation handlers', async () => {
      await handleMetaMaskDeeplink({
        handled,
        params,
        url,
        origin,
        wcURL,
      });

      expect(mockHandleRampUrl).not.toHaveBeenCalled();
    });
  });
});

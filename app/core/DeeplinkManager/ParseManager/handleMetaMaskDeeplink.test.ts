import { ACTIONS, PREFIXES } from '../../../constants/deeplinks';
import AppConstants from '../../AppConstants';
import { Minimizer } from '../../NativeModules';
import SDKConnect from '../../SDKConnect/SDKConnect';
import WC2Manager from '../../WalletConnect/WalletConnectV2';
import DeeplinkManager from '../DeeplinkManager';
import extractURLParams from './extractURLParams';
import handleMetaMaskDeeplink from './handleMetaMaskDeeplink';
import handleDeeplink from '../../SDKConnect/handlers/handleDeeplink';

jest.mock('../../../core/AppConstants');
jest.mock('../../../core/SDKConnect/handlers/handleDeeplink');
jest.mock('../../../core/SDKConnect/SDKConnect');
jest.mock('../../../core/WalletConnect/WalletConnectV2');
jest.mock('../../../core/NativeModules', () => ({
  Minimizer: {
    goBack: jest.fn(),
  },
}));

describe('handleMetaMaskProtocol', () => {
  const mockParse = jest.fn();
  const mockHandleBuyCrypto = jest.fn();
  const mockHandleSellCrypto = jest.fn();
  const mockHandleBrowserUrl = jest.fn();
  const mockConnectToChannel = jest.fn();
  const mockGetConnections = jest.fn();
  const mockRevalidateChannel = jest.fn();
  const mockReconnect = jest.fn();
  const mockWC2ManagerConnect = jest.fn();
  const mockGetApprovedHosts = jest.fn();
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

  let url = '';

  let params = {
    pubkey: '',
    uri: '',
    redirect: '',
    channelId: '',
    comm: '',
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

  describe('when url starts with ${PREFIXES.METAMASK}${ACTIONS.CONNECT}', () => {
    beforeEach(() => {
      url = `${PREFIXES.METAMASK}${ACTIONS.CONNECT}`;
    });

    it('should call Minimizer.goBack when params.redirect is truthy', () => {
      params.redirect = 'ABC';

      handleMetaMaskDeeplink({
        instance,
        handled,
        params,
        url,
        origin,
        wcURL,
      });

      expect(Minimizer.goBack).toHaveBeenCalled();
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
        sdkConnect: {
          getConnections: mockGetConnections,
          connectToChannel: mockConnectToChannel,
          revalidateChannel: mockRevalidateChannel,
          reconnect: mockReconnect,
          getApprovedHosts: mockGetApprovedHosts,
          bindAndroidSDK: mockBindAndroidSDK,
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

    it('should call _handleBuyCrypto', () => {
      handleMetaMaskDeeplink({
        instance,
        handled,
        params,
        url,
        origin,
        wcURL,
      });

      expect(mockHandleBuyCrypto).toHaveBeenCalled();
    });
  });

  describe('when url start with ${PREFIXES.METAMASK}${ACTIONS.SELL_CRYPTO}', () => {
    beforeEach(() => {
      url = `${PREFIXES.METAMASK}${ACTIONS.SELL_CRYPTO}`;
    });

    it('should call _handleSellCrypto', () => {
      handleMetaMaskDeeplink({
        instance,
        handled,
        params,
        url,
        origin,
        wcURL,
      });

      expect(mockHandleSellCrypto).toHaveBeenCalled();
    });
  });
});

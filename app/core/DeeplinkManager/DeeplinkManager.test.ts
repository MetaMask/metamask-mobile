import { waitFor } from '@testing-library/react-native';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import NavigationService from '../NavigationService';
import DeeplinkManager from './DeeplinkManager';
import handleBrowserUrl from './Handlers/handleBrowserUrl';
import handleEthereumUrl from './Handlers/handleEthereumUrl';
import handleRampUrl from './Handlers/handleRampUrl';
import switchNetwork from './Handlers/switchNetwork';
import parseDeeplink from './ParseManager/parseDeeplink';
import approveTransaction from './TransactionManager/approveTransaction';
import { RampType } from '../../reducers/fiatOrders/types';
import { handleSwapUrl } from './Handlers/handleSwapUrl';
import { handleCreateAccountUrl } from './Handlers/handleCreateAccountUrl';
import { handlePerpsUrl, handlePerpsAssetUrl } from './Handlers/handlePerpsUrl';
import Routes from '../../constants/navigation/Routes';
import FCMService from '../../util/notifications/services/FCMService';
import { handleDeeplink } from './Handlers/handleDeeplink';
import AppConstants from '../AppConstants';

jest.mock('./TransactionManager/approveTransaction');
jest.mock('./Handlers/handleEthereumUrl');
jest.mock('./Handlers/handleBrowserUrl');
jest.mock('./Handlers/handleRampUrl');
jest.mock('./ParseManager/parseDeeplink');
jest.mock('./Handlers/switchNetwork');
jest.mock('./Handlers/handleSwapUrl');
jest.mock('./Handlers/handleCreateAccountUrl');
jest.mock('./Handlers/handlePerpsUrl');
jest.mock('./Handlers/handleDeeplink');
jest.mock('../../util/notifications/services/FCMService');

const mockNavigation = {
  navigate: jest.fn(),
} as unknown as NavigationProp<ParamListBase>;

describe('DeeplinkManager', () => {
  let deeplinkManager: DeeplinkManager;

  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure navigation is available before DeeplinkManager is constructed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    NavigationService.navigation = mockNavigation as any;
    deeplinkManager = new DeeplinkManager();
  });

  it('should set, get, and expire a deeplink correctly', () => {
    const testUrl = 'https://example.com';
    deeplinkManager.setDeeplink(testUrl);
    expect(deeplinkManager.getPendingDeeplink()).toBe(testUrl);

    deeplinkManager.expireDeeplink();
    expect(deeplinkManager.getPendingDeeplink()).toBeNull();
  });

  it('should handle network switch correctly', () => {
    const chainId = '1';
    deeplinkManager._handleNetworkSwitch(chainId);
    expect(switchNetwork).toHaveBeenCalledWith({
      deeplinkManager,
      switchToChainId: chainId,
    });
  });

  it('should handle transaction approval correctly', async () => {
    const ethUrl = {
      parameters: {},
      target_address: '0x...',
      chain_id: '1',
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const origin = 'testOrigin';

    await deeplinkManager._approveTransaction(ethUrl, origin);

    expect(approveTransaction).toHaveBeenCalledWith({
      deeplinkManager,
      ethUrl,
      origin,
    });
  });

  it('should handle Ethereum URL correctly', async () => {
    const url = 'ethereum://example.com';
    const origin = 'testOrigin';

    await deeplinkManager._handleEthereumUrl(url, origin);

    expect(handleEthereumUrl).toHaveBeenCalledWith({
      deeplinkManager,
      url,
      origin,
    });
  });

  it('should handle browser URL correctly', () => {
    const url = 'http://example.com';
    const callback = jest.fn();

    deeplinkManager._handleBrowserUrl(url, callback);

    expect(handleBrowserUrl).toHaveBeenCalledWith({
      deeplinkManager,
      url,
      callback,
    });
  });

  it('should handle buy crypto action correctly', () => {
    const rampPath = '/example/path?and=params';
    deeplinkManager._handleBuyCrypto(rampPath);
    expect(handleRampUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        rampPath,
        navigation: mockNavigation,
        rampType: RampType.BUY,
      }),
    );
  });

  it('should handle sell crypto action correctly', () => {
    const rampPath = '/example/path?and=params';
    deeplinkManager._handleSellCrypto(rampPath);
    expect(handleRampUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        rampPath,
        navigation: mockNavigation,
        rampType: RampType.SELL,
      }),
    );
  });

  it('should parse deeplinks correctly', () => {
    const url = 'http://example.com';
    const browserCallBack = jest.fn();
    const origin = 'testOrigin';
    const onHandled = jest.fn();

    deeplinkManager.parse(url, {
      browserCallBack,
      origin,
      onHandled,
    });

    expect(parseDeeplink).toHaveBeenCalledWith({
      deeplinkManager,
      url,
      origin,
      browserCallBack,
      onHandled,
    });
  });

  it('should handle open home correctly', () => {
    deeplinkManager._handleOpenHome();
    expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
  });

  it('should handle swap correctly', () => {
    const swapPath = '/swap/path';
    deeplinkManager._handleSwap(swapPath);
    expect(handleSwapUrl).toHaveBeenCalledWith({
      swapPath,
    });
  });

  it('should handle create account correctly', () => {
    const createAccountPath = '/create/account/path';
    deeplinkManager._handleCreateAccount(createAccountPath);
    expect(handleCreateAccountUrl).toHaveBeenCalledWith({
      path: createAccountPath,
      navigation: mockNavigation,
    });
  });

  it('should handle perps correctly', () => {
    const perpsPath = '/perps/markets';
    deeplinkManager._handlePerps(perpsPath);
    expect(handlePerpsUrl).toHaveBeenCalledWith({
      perpsPath,
    });
  });

  it('should handle perps asset correctly', () => {
    const assetPath = '/BTC';
    deeplinkManager._handlePerpsAsset(assetPath);
    expect(handlePerpsAssetUrl).toHaveBeenCalledWith({
      assetPath,
    });
  });
});

describe('DeeplinkManager.start() - FCM Push Notification Integration', () => {
  const arrangeMocks = () => {
    const mockOnClickPushNotificationWhenAppClosed = jest.mocked(
      FCMService.onClickPushNotificationWhenAppClosed,
    );
    const mockOnClickPushNotificationWhenAppSuspended = jest.mocked(
      FCMService.onClickPushNotificationWhenAppSuspended,
    );
    const mockHandleDeeplink = jest.mocked(handleDeeplink);

    return {
      mockOnClickPushNotificationWhenAppClosed,
      mockOnClickPushNotificationWhenAppSuspended,
      mockHandleDeeplink,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Push Notification - App Closed', () => {
    const arrangeAct = async (deeplink: string | null) => {
      const mocks = arrangeMocks();
      mocks.mockOnClickPushNotificationWhenAppClosed.mockResolvedValue(
        deeplink,
      );

      DeeplinkManager.start();

      return mocks;
    };

    it('handles deeplink when push notification clicked from closed app', async () => {
      const testDeeplink = 'https://link.metamask.io/perps-asset?symbol=ETH';

      const mocks = await arrangeAct(testDeeplink);

      await waitFor(() => {
        expect(
          mocks.mockOnClickPushNotificationWhenAppClosed,
        ).toHaveBeenCalled();
        expect(mocks.mockHandleDeeplink).toHaveBeenCalledWith({
          uri: testDeeplink,
          overrideOrigin: AppConstants.DEEPLINKS.ORIGIN_NOTIFICATION,
        });
      });
    });

    it('does not handle deeplink when no deeplink returned from closed app', async () => {
      const mocks = await arrangeAct(null);

      await waitFor(() => {
        expect(
          mocks.mockOnClickPushNotificationWhenAppClosed,
        ).toHaveBeenCalled();
        expect(mocks.mockHandleDeeplink).not.toHaveBeenCalled();
      });
    });
  });

  describe('Push Notification - App Suspended', () => {
    const arrangeAct = (deeplink?: string) => {
      const mocks = arrangeMocks();

      DeeplinkManager.start();

      // Get the callback that was passed to onClickPushNotificationWhenAppSuspended
      const suspendedCallback =
        mocks.mockOnClickPushNotificationWhenAppSuspended.mock.calls[0][0];

      // Simulate the callback being called
      suspendedCallback(deeplink);

      return mocks;
    };

    it('handles deeplink when push notification clicked from suspended app', () => {
      const testDeeplink = 'https://link.metamask.io/perps-asset?symbol=ETH';

      const mocks = arrangeAct(testDeeplink);

      expect(
        mocks.mockOnClickPushNotificationWhenAppSuspended,
      ).toHaveBeenCalledWith(expect.any(Function));
      expect(mocks.mockHandleDeeplink).toHaveBeenCalledWith({
        uri: testDeeplink,
        overrideOrigin: AppConstants.DEEPLINKS.ORIGIN_NOTIFICATION,
      });
    });

    it('does not handle deeplink when no deeplink provided from suspended app', () => {
      const mocks = arrangeAct(undefined);

      expect(
        mocks.mockOnClickPushNotificationWhenAppSuspended,
      ).toHaveBeenCalledWith(expect.any(Function));
      expect(mocks.mockHandleDeeplink).not.toHaveBeenCalled();
    });
  });
});

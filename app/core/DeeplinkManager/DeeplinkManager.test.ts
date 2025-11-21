import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { waitFor } from '@testing-library/react-native';
import FCMService from '../../util/notifications/services/FCMService';
import NavigationService from '../NavigationService';
import DeeplinkManager from './DeeplinkManager';
import { handleDeeplink } from './handleDeeplink';
import switchNetwork from './handlers/legacy/switchNetwork';
import parseDeeplink from './parseDeeplink';
import approveTransaction from './utils/approveTransaction';

jest.mock('./utils/approveTransaction');
jest.mock('./handlers/legacy/handleEthereumUrl');
jest.mock('./handlers/legacy/handleBrowserUrl');
jest.mock('./handlers/legacy/handleRampUrl');
jest.mock('./parseDeeplink');
jest.mock('./handlers/legacy/switchNetwork');
jest.mock('./handlers/legacy/handleSwapUrl');
jest.mock('./handlers/legacy/handleCreateAccountUrl');
jest.mock('./handlers/legacy/handlePerpsUrl');
jest.mock('./handlers/legacy/handleRewardsUrl');
jest.mock('./handleDeeplink');
jest.mock('./handlers/legacy/handleFastOnboarding');
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

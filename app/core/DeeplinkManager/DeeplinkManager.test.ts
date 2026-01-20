import { NavigationProp } from '@react-navigation/native';
import { RootParamList } from '../../types/navigation';
import { waitFor } from '@testing-library/react-native';
import FCMService from '../../util/notifications/services/FCMService';
import NavigationService from '../NavigationService';
import SharedDeeplinkManager, { DeeplinkManager } from './DeeplinkManager';
import { handleDeeplink } from './handlers/legacy/handleDeeplink';
import switchNetwork from '../../util/networks/switchNetwork';
import parseDeeplink from './utils/parseDeeplink';
import handleApproveUrl from './handlers/legacy/handleApproveUrl';
import { store } from '../../store';
import { RootState } from '../../reducers';
import branch from 'react-native-branch';
import AppConstants from '../AppConstants';

jest.mock('./handlers/legacy/handleApproveUrl');
jest.mock('./handlers/legacy/handleEthereumUrl');
jest.mock('./handlers/legacy/handleBrowserUrl');
jest.mock('./handlers/legacy/handleRampUrl');
jest.mock('./utils/parseDeeplink');
jest.mock('../../util/networks/switchNetwork');
jest.mock('./handlers/legacy/handleSwapUrl');
jest.mock('./handlers/legacy/handleCreateAccountUrl');
jest.mock('./handlers/legacy/handlePerpsUrl');
jest.mock('./handlers/legacy/handleRewardsUrl');
jest.mock('./handlers/legacy/handleDeeplink');
jest.mock('./handlers/legacy/handleFastOnboarding');
jest.mock('../../util/notifications/services/FCMService');
jest.mock('../../store', () => ({
  store: {
    getState: jest.fn(),
  },
}));

// Branch and Linking mocks for DeeplinkManager.start tests
jest.mock('react-native-branch', () => ({
  __esModule: true,
  default: {
    subscribe: jest.fn(),
    getLatestReferringParams: jest.fn(),
  },
}));

const mockNavigation = {
  navigate: jest.fn(),
} as unknown as NavigationProp<RootParamList>;

const mockStore = store as jest.Mocked<typeof store>;

describe('DeeplinkManager', () => {
  let deeplinkManager: DeeplinkManager;

  beforeEach(() => {
    jest.clearAllMocks();
    DeeplinkManager.resetInstance();
    // Ensure navigation is available before DeeplinkManager is constructed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    NavigationService.navigation = mockNavigation as any;
    deeplinkManager = new DeeplinkManager();
  });

  it('sets, gets, and expires a deeplink correctly', () => {
    const testUrl = 'https://example.com';
    deeplinkManager.setDeeplink(testUrl);
    expect(deeplinkManager.getPendingDeeplink()).toBe(testUrl);

    deeplinkManager.expireDeeplink();
    expect(deeplinkManager.getPendingDeeplink()).toBeNull();
  });

  it('handles network switch correctly', () => {
    const chainId = '1';
    switchNetwork({ switchToChainId: chainId });
    expect(switchNetwork).toHaveBeenCalledWith({
      switchToChainId: chainId,
    });
  });

  it('handles transaction approval correctly', async () => {
    const ethUrl = {
      parameters: {},
      target_address: '0x...',
      chain_id: '1',
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const origin = 'testOrigin';

    await handleApproveUrl({ ethUrl, origin });

    expect(handleApproveUrl).toHaveBeenCalledWith({
      ethUrl,
      origin,
    });
  });

  it('parses deeplinks correctly', () => {
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
          source: AppConstants.DEEPLINKS.ORIGIN_PUSH_NOTIFICATION,
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
        source: AppConstants.DEEPLINKS.ORIGIN_PUSH_NOTIFICATION,
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

describe('SharedDeeplinkManager', () => {
  beforeEach(() => {
    const mockedState = {
      settings: { deepLinkModalDisabled: false },
    } as jest.Mocked<RootState>;

    mockStore.getState.mockReturnValue(mockedState);
    DeeplinkManager.resetInstance();
    SharedDeeplinkManager.init();
    jest.clearAllMocks();
  });

  it('returns DeeplinkManager instance from getInstance', () => {
    const instance = SharedDeeplinkManager.getInstance();

    expect(instance).toBeDefined();
    expect(instance).toBeInstanceOf(DeeplinkManager);
  });

  it('calls parse method on the DeeplinkManager instance', () => {
    const instance = SharedDeeplinkManager.getInstance();
    const spyParse = jest.spyOn(instance, 'parse');

    const url = 'http://example.com';
    const args = {
      browserCallBack: jest.fn(),
      origin: 'test-origin',
      onHandled: jest.fn(),
    };

    SharedDeeplinkManager.parse(url, args);

    expect(spyParse).toHaveBeenCalledWith(url, args);
  });

  it('calls setDeeplink method on the DeeplinkManager instance', () => {
    const instance = SharedDeeplinkManager.getInstance();
    const spySetDeeplink = jest.spyOn(instance, 'setDeeplink');

    const url = 'http://example.com';
    SharedDeeplinkManager.setDeeplink(url);

    expect(spySetDeeplink).toHaveBeenCalledWith(url);
  });

  it('calls getPendingDeeplink method on the DeeplinkManager instance', () => {
    const instance = SharedDeeplinkManager.getInstance();
    const spyGetPendingDeeplink = jest.spyOn(instance, 'getPendingDeeplink');

    SharedDeeplinkManager.getPendingDeeplink();

    expect(spyGetPendingDeeplink).toHaveBeenCalled();
  });

  it('calls expireDeeplink method on the DeeplinkManager instance', () => {
    const instance = SharedDeeplinkManager.getInstance();
    const spyExpireDeeplink = jest.spyOn(instance, 'expireDeeplink');

    SharedDeeplinkManager.expireDeeplink();

    expect(spyExpireDeeplink).toHaveBeenCalled();
  });
});

describe('DeeplinkManager.start Branch deeplink handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls getLatestReferringParams immediately for cold start deeplink check', async () => {
    (branch.getLatestReferringParams as jest.Mock).mockResolvedValue({});
    DeeplinkManager.start();
    await new Promise((resolve) => setImmediate(resolve));
    expect(branch.getLatestReferringParams).toHaveBeenCalledTimes(1);
  });

  it('processes cold start deeplink when non-branch link is found', async () => {
    const mockDeeplink = 'https://link.metamask.io/home';
    (branch.getLatestReferringParams as jest.Mock).mockResolvedValue({
      '+non_branch_link': mockDeeplink,
    });
    DeeplinkManager.start();
    await new Promise((resolve) => setImmediate(resolve));
    expect(handleDeeplink).toHaveBeenCalledWith({ uri: mockDeeplink });
  });

  it('subscribes to Branch deeplink events', async () => {
    DeeplinkManager.start();
    expect(branch.subscribe).toHaveBeenCalled();
  });

  it('processes deeplink from subscription callback when uri is provided', async () => {
    DeeplinkManager.start();
    expect(branch.subscribe).toHaveBeenCalledWith(expect.any(Function));
    const callback = (branch.subscribe as jest.Mock).mock.calls[0][0];
    const mockUri = 'https://link.metamask.io/home';
    callback({ uri: mockUri });
    await new Promise((resolve) => setImmediate(resolve));
    expect(handleDeeplink).toHaveBeenCalledWith({ uri: mockUri });
  });
});

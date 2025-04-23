/* eslint-disable @typescript-eslint/no-explicit-any */
import WalletConnect2Session from './WalletConnect2Session';
import { NavigationContainerRef } from '@react-navigation/native';
import { IWalletKit } from '@reown/walletkit';
import { SessionTypes } from '@walletconnect/types';
import { store } from '../../store';
import Engine from '../Engine';
import { selectEvmChainId } from '../../selectors/networkController';
import { Platform, Linking } from 'react-native';
import Routes from '../../../app/constants/navigation/Routes';
import Device from '../../util/device';
import { Minimizer } from '../NativeModules';
import DevLogger from '../SDKConnect/utils/DevLogger';

jest.mock('../AppConstants', () => ({
  WALLET_CONNECT: {
    PROJECT_ID: 'test-project-id',
    METADATA: {
      name: 'Test Wallet',
      description: 'Test Wallet Description',
      url: 'https://example.com',
      icons: ['https://example.com/icon.png'],
    },
  },
  BUNDLE_IDS: {
    ANDROID: 'com.test.app',
  },
}));

jest.mock('@reown/walletkit', () => {
  const mockClient = {
    approveRequest: jest.fn(),
    rejectRequest: jest.fn(),
    updateSession: jest.fn(),
    getPendingSessionRequests: jest.fn(),
    respondSessionRequest: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    emitSessionEvent: jest.fn(),
  };

  return {
    __esModule: true,
    default: {
      init: jest.fn().mockResolvedValue(mockClient),
    },
    WalletKit: {
      init: jest.fn().mockResolvedValue(mockClient),
    },
    Client: jest.fn().mockImplementation(() => mockClient),
  };
});

jest.mock('../BackgroundBridge/BackgroundBridge', () =>
  jest.fn().mockImplementation(() => ({
    onMessage: jest.fn(),
    onDisconnect: jest.fn(),
    setupProviderConnection: jest.fn(),
  })),
);

jest.mock('@react-navigation/native');
jest.mock('../Engine');
jest.mock('../SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));
jest.mock('../Permissions', () => ({
  getPermittedAccounts: jest.fn().mockResolvedValue(['0x1234567890abcdef1234567890abcdef12345678']),
  getPermittedChains: jest.fn().mockResolvedValue(['eip155:1']),
}));
jest.mock('../../store', () => ({
  store: {
    getState: jest.fn(),
    subscribe: jest.fn(),
  },
}));
jest.mock('../RPCMethods/RPCMethodMiddleware', () => ({
  __esModule: true,
  default: () => () => ({ acknowledged: () => Promise.resolve() }),
}));
jest.mock('./wc-utils', () => ({
  hideWCLoadingState: jest.fn(),
  showWCLoadingState: jest.fn(),
  checkWCPermissions: jest.fn().mockResolvedValue(true),
  getScopedPermissions: jest.fn().mockResolvedValue({
    eip155: {
      chains: ['eip155:1'],
      methods: ['eth_sendTransaction'],
      events: ['chainChanged', 'accountsChanged'],
      accounts: ['eip155:1:0x1234567890abcdef1234567890abcdef12345678']
    }
  }),
  normalizeOrigin: jest.fn().mockImplementation((url) => url),
}));
jest.mock('../../selectors/networkController', () => ({
  selectEvmChainId: jest.fn(),
}));

jest.mock('../../util/device', () => ({
  isIos: jest.fn(),
}));

jest.mock('../NativeModules', () => ({
  Minimizer: {
    goBack: jest.fn(),
  },
}));

describe('WalletConnect2Session', () => {
  let session: WalletConnect2Session;
  let mockClient: IWalletKit;
  let mockSession: SessionTypes.Struct;
  let mockNavigation: NavigationContainerRef;

  beforeEach(() => {
    mockClient = new (jest.requireMock('@reown/walletkit').Client)();
    mockSession = {
      topic: 'test-topic',
      pairingTopic: 'test-pairing',
      peer: {
        metadata: { url: 'https://example.com', name: 'Test App', icons: [] },
      },
    } as unknown as SessionTypes.Struct;
    mockNavigation = {
      navigate: jest.fn(),
    } as unknown as NavigationContainerRef;

    (store.getState as jest.Mock).mockReturnValue({
      inpageProvider: {
        networkId: '1',
      },
    });

    Object.defineProperty(Engine, 'context', {
      value: {
        AccountsController: {
          getSelectedAccount: jest.fn().mockReturnValue({
            address: '0x1234567890abcdef1234567890abcdef12345678',
          }),
        },
        NetworkController: {
          getProviderAndBlockTracker: jest.fn().mockReturnValue({
            provider: {},
            blockTracker: {},
          }),
          getNetworkClientById: jest.fn().mockReturnValue({ chainId: '0x2' }),
        },
        PermissionController: {
          createPermissionMiddleware: jest.fn().mockReturnValue(() => ({ result: true })),
        },
      },
      writable: true,
    });

    session = new WalletConnect2Session({
      web3Wallet: mockClient,
      session: mockSession,
      channelId: 'test-channel',
      deeplink: true,
      navigation: mockNavigation,
    });

    (session as any).topicByRequestId = { '1': mockSession.topic };

    // Mock Platform
    jest.spyOn(Platform, 'Version', 'get').mockReturnValue('17.0');
    jest.spyOn(Platform, 'select').mockImplementation(jest.fn());

    // Mock Linking
    jest.spyOn(Linking, 'openURL').mockReturnValue(Promise.resolve());
  });

  it('initializes correctly in constructor', () => {
    expect(session).toBeTruthy();
    expect((session as any).topicByRequestId).toEqual({
      '1': mockSession.topic,
    });
  });

  it('sets deeplink correctly', () => {
    session.setDeeplink(false);
    expect((session as any).deeplink).toBe(false);
  });

  it('rejects invalid chainId', async () => {
    const mockRespondSessionRequest = jest
      .spyOn(mockClient, 'respondSessionRequest')
      .mockImplementation(async () => { /* empty implementation */ });

    const requestEvent = {
      id: '1',
      topic: 'test-topic',
      params: {
        chainId: '0x2',
        request: {
          method: 'eth_sendTransaction',
          params: [],
        },
      },
      verifyContext: {
        verified: {
          origin: 'https://example.com'
        }
      },
    };

    const { checkWCPermissions } = jest.requireMock('./wc-utils');
    checkWCPermissions.mockResolvedValueOnce(false);

    await session.handleRequest(requestEvent as any);

    expect(mockRespondSessionRequest).toHaveBeenCalledWith({
      topic: mockSession.topic,
      response: {
        id: '1',
        jsonrpc: '2.0',
        error: { code: 4902, message: 'Invalid chainId' },
      },
    });
  });

  it('removes listeners correctly', async () => {
    const mockOnDisconnect = jest.spyOn(
      (session as any).backgroundBridge,
      'onDisconnect',
    );

    await session.removeListeners();

    expect(mockOnDisconnect).toHaveBeenCalled();
  });

  it('approves a request correctly', async () => {
    const mockRespondSessionRequest = jest
      .spyOn(mockClient, 'respondSessionRequest')
      .mockResolvedValue(undefined);
    const request = { id: '1', result: '0x123' };

    await session.approveRequest(request);

    expect(mockRespondSessionRequest).toHaveBeenCalledWith({
      topic: mockSession.topic,
      response: {
        id: 1,
        jsonrpc: '2.0',
        result: request.result,
      },
    });
  });

  it('rejects a request correctly', async () => {
    const mockRespondSessionRequest = jest
      .spyOn(mockClient, 'respondSessionRequest')
      .mockResolvedValue(undefined);
    const request = { id: '1', error: new Error('User rejected') };

    await session.rejectRequest(request);

    expect(mockRespondSessionRequest).toHaveBeenCalledWith({
      topic: mockSession.topic,
      response: {
        id: 1,
        jsonrpc: '2.0',
        error: { code: 5000, message: 'User rejected' },
      },
    });
  });

  it('updates session', async () => {
    const mockUpdateSession = jest
      .spyOn(mockClient, 'updateSession')
      .mockResolvedValue({ acknowledged: () => Promise.resolve() });
    const accounts = ['0x123'];
    const chainId = 1;

    (store.getState as jest.Mock).mockReturnValue({
      inpageProvider: {
        networkId: '1',
      },
    });

    await session.updateSession({ chainId, accounts });

    expect(mockUpdateSession).toHaveBeenCalledWith({
      topic: mockSession.topic,
      namespaces: {
        eip155: {
          chains: ['eip155:1'],
          methods: ['eth_sendTransaction'],
          events: ['chainChanged', 'accountsChanged'],
          accounts: ['eip155:1:0x1234567890abcdef1234567890abcdef12345678']
        }
      }
    });
  });

  it('subscribes to chain changes', async () => {
    // eslint-disable-next-line no-empty-function
    let subscriberCallback: () => void = () => {};
    (store.subscribe as jest.Mock).mockImplementation((callback: () => void) => {
      subscriberCallback = callback;
    });

    // Mock initial chain ID
    (selectEvmChainId as unknown as jest.Mock).mockReturnValue('0x1');

    session = new WalletConnect2Session({
      web3Wallet: mockClient,
      session: mockSession,
      channelId: 'test-channel',
      deeplink: true,
      navigation: mockNavigation,
    });

    const handleChainChangeSpy = jest.spyOn(session as any, 'handleChainChange');

    // Change the chain ID
    (selectEvmChainId as unknown as jest.Mock).mockReturnValue('0x2');

    subscriberCallback();

    await new Promise(process.nextTick);

    expect(handleChainChangeSpy).toHaveBeenCalledWith(2);

    subscriberCallback();
    expect(handleChainChangeSpy).toHaveBeenCalledTimes(1);

    handleChainChangeSpy.mockRestore();
  });

  it('does not trigger handleChainChange when handler is already running', async () => {
    // eslint-disable-next-line no-empty-function
    let subscriberCallback: () => void = () => {};
    (store.subscribe as jest.Mock).mockImplementation((callback: () => void) => {
      subscriberCallback = callback;
    });

    (selectEvmChainId as unknown as jest.Mock).mockReturnValue('0x1');

    session = new WalletConnect2Session({
      web3Wallet: mockClient,
      session: mockSession,
      channelId: 'test-channel',
      deeplink: true,
      navigation: mockNavigation,
    });

    (session as any).isHandlingChainChange = true;

    const handleChainChangeSpy = jest.spyOn(session as any, 'handleChainChange');

    (selectEvmChainId as unknown as jest.Mock).mockReturnValue('0x2');

    subscriberCallback();

    await new Promise(process.nextTick);

    expect(handleChainChangeSpy).not.toHaveBeenCalled();

    handleChainChangeSpy.mockRestore();
  });

  it('logs warning on handleChainChange error', async () => {
    // eslint-disable-next-line no-empty-function
    let subscriberCallback: () => void = () => {};
    (store.subscribe as jest.Mock).mockImplementation((callback: () => void) => {
      subscriberCallback = callback;
    });

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    (selectEvmChainId as unknown as jest.Mock).mockReturnValue('0x1');

    session = new WalletConnect2Session({
      web3Wallet: mockClient,
      session: mockSession,
      channelId: 'test-channel',
      deeplink: true,
      navigation: mockNavigation,
    });

    const error = new Error('Chain change failed');
    jest.spyOn(session as any, 'handleChainChange').mockRejectedValueOnce(error);

    (selectEvmChainId as unknown as jest.Mock).mockReturnValue('0x2');

    subscriberCallback();

    await new Promise(process.nextTick);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'WC2::store.subscribe Error handling chain change:',
      error
    );

    consoleWarnSpy.mockRestore();
  });

  describe('redirect', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('does not follow the deeplink process when deeplink is false', () => {
      session.setDeeplink(false);
      session.redirect('test');
      jest.runAllTimers();
      
      expect(Linking.openURL).not.toHaveBeenCalled();
      expect(Minimizer.goBack).not.toHaveBeenCalled();
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });

    it('allows backward navigation for non-iOS devices', () => {
      (Device.isIos as jest.Mock).mockReturnValue(false);
      
      session.redirect('test');
      jest.runAllTimers();

      expect(Minimizer.goBack).toHaveBeenCalled();
      expect(Linking.openURL).not.toHaveBeenCalled();
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });

    describe('iOS specific behavior', () => {
      beforeEach(() => {
        (Device.isIos as jest.Mock).mockReturnValue(true);
        //(Platform.Version as any) = '17.0';
      });

      it('opens peerLink if available', async () => {
        const mockPeerLink = 'https://example.com';
        session.session = {
          ...mockSession,
          peer: {
            metadata: {
              ...mockSession.peer.metadata,
              redirect: {
                native: mockPeerLink,
              },
            },
          },
        } as any;

        session.redirect('test');
        jest.runAllTimers();

        expect(Linking.openURL).toHaveBeenCalledWith(mockPeerLink);
        expect(mockNavigation.navigate).not.toHaveBeenCalled();
      });

      it('falls back to universal link if native link is not available', async () => {
        const mockUniversalLink = 'https://universal.example.com';
        session.session = {
          ...mockSession,
          peer: {
            metadata: {
              ...mockSession.peer.metadata,
              redirect: {
                universal: mockUniversalLink,
              },
            },
          },
        } as any;

        session.redirect('test');
        jest.runAllTimers();

        expect(Linking.openURL).toHaveBeenCalledWith(mockUniversalLink);
        expect(mockNavigation.navigate).not.toHaveBeenCalled();
      });

      it('shows "return to dapp" modal if no peerLink is available', () => {
        session.session = {
          ...mockSession,
          peer: {
            metadata: {
              ...mockSession.peer.metadata,
              redirect: {},
            },
          },
        } as any;

        session.redirect('test');
        jest.runAllTimers();

        expect(mockNavigation.navigate).toHaveBeenCalledWith(
          Routes.MODAL.ROOT_MODAL_FLOW,
          {
            screen: Routes.SHEET.RETURN_TO_DAPP_MODAL,
          }
        );
        expect(Linking.openURL).not.toHaveBeenCalled();
      });

      it('shows "return to dapp" modal if opening peerLink fails', async () => {
        const mockPeerLink = 'https://example.com';
        session.session = {
          ...mockSession,
          peer: {
            metadata: {
              ...mockSession.peer.metadata,
              redirect: {
                native: mockPeerLink,
              },
            },
          },
        } as any;

        (Linking.openURL as jest.Mock).mockReturnValue(Promise.reject(new Error('Failed to open URL')));

        session.redirect('test');
        jest.runAllTimers();

        // Force jest to process all pending promises
        await Promise.resolve();

        expect(Linking.openURL).toHaveBeenCalledWith(mockPeerLink);
        expect(mockNavigation.navigate).toHaveBeenCalledWith(
          Routes.MODAL.ROOT_MODAL_FLOW,
          {
            screen: Routes.SHEET.RETURN_TO_DAPP_MODAL,
          }
        );
        expect(DevLogger.log).toHaveBeenLastCalledWith(
          `WC2::redirect error while opening ${mockPeerLink} with error Error: Failed to open URL`
        );
      });

      it('skips iOS specific logic for iOS versions below 17', () => {
        jest.spyOn(Platform, 'Version', 'get').mockReturnValue('16.0');
        
        session.redirect('test');
        jest.runAllTimers();

        expect(Minimizer.goBack).toHaveBeenCalled();
        expect(Linking.openURL).not.toHaveBeenCalled();
        expect(mockNavigation.navigate).not.toHaveBeenCalled();
      });
    });
  });

  describe('needsRedirect', () => {
    beforeEach(() => {
      // Reset the requestsToRedirect object
      (session as any).requestsToRedirect = {};
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runAllTimers();
      jest.clearAllTimers();
    })

    it('calls redirect when requestId exists in requestsToRedirect', () => {
      const requestId = '123';
      
      // Set up the requestsToRedirect object with the test ID
      (session as any).requestsToRedirect = { 
        [requestId]: true 
      };
      
      // Spy on the redirect method
      const redirectSpy = jest.spyOn(session, 'redirect');
      
      // Call the method under test
      session.needsRedirect(requestId);
      
      // Verify redirect was called with the expected parameter
      expect(redirectSpy).toHaveBeenCalledWith(`needsRedirect_${requestId}`);
      
      // Verify the ID was removed from requestsToRedirect
      expect((session as any).requestsToRedirect[requestId]).toBeUndefined();
    });

    it('does not call redirect when requestId does not exist', () => {
      const requestId = '123';
      
      // Set up empty requestsToRedirect object
      (session as any).requestsToRedirect = {};
      
      // Spy on the redirect method
      const redirectSpy = jest.spyOn(session, 'redirect');
      
      // Call the method under test
      session.needsRedirect(requestId);
      
      // Verify redirect was not called
      expect(redirectSpy).not.toHaveBeenCalled();
    });

    it('handles multiple requests correctly', () => {
      // Set up multiple request IDs
      (session as any).requestsToRedirect = { 
        '123': true,
        '456': true,
        '789': true
      };
      
      const redirectSpy = jest.spyOn(session, 'redirect');
      
      // Process first request
      session.needsRedirect('123');
      expect(redirectSpy).toHaveBeenCalledWith('needsRedirect_123');
      expect((session as any).requestsToRedirect['123']).toBeUndefined();
      
      // Other requests should still be there
      expect((session as any).requestsToRedirect['456']).toBe(true);
      expect((session as any).requestsToRedirect['789']).toBe(true);
      
      // Reset the spy
      redirectSpy.mockClear();
      
      // Process second request
      session.needsRedirect('456');
      expect(redirectSpy).toHaveBeenCalledWith('needsRedirect_456');
      expect((session as any).requestsToRedirect['456']).toBeUndefined();
      
      // And the third request should still be there
      expect((session as any).requestsToRedirect['789']).toBe(true);
    });
  });
});

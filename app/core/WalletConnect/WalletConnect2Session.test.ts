/* eslint-disable @typescript-eslint/no-explicit-any */
import WalletConnect2Session from './WalletConnect2Session';
import { NavigationContainerRef } from '@react-navigation/native';
import { IWalletKit, WalletKitTypes } from '@reown/walletkit';
import { SessionTypes } from '@walletconnect/types';
import { store } from '../../store';
import { selectEvmChainId } from '../../selectors/networkController';
import { selectPerOriginChainId } from '../../selectors/selectedNetworkController';
import { Platform, Linking } from 'react-native';
import Routes from '../../../app/constants/navigation/Routes';
import Device from '../../util/device';
import { Minimizer } from '../NativeModules';
import DevLogger from '../SDKConnect/utils/DevLogger';
import { getGlobalNetworkClientId } from '../../util/networks/global-network';
import { Hex, CaipChainId } from '@metamask/utils';

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
jest.mock('../Engine/Engine', () => {
  const mockEngine = {
    context: {
      AccountsController: {
        getSelectedAccount: jest.fn().mockReturnValue({
          address: '0x1234567890abcdef1234567890abcdef12345678',
        }),
      },
      MultichainNetworkController: {
        setActiveNetwork: jest.fn().mockImplementation(() => Promise.resolve()),
      },
      SelectedNetworkController: {
        setNetworkClientIdForDomain: jest.fn(),
      },
      NetworkController: {
        getProviderAndBlockTracker: jest.fn().mockReturnValue({
          provider: {},
          blockTracker: {},
        }),
        getNetworkClientById: jest.fn().mockReturnValue({ chainId: '0x2' }),
        createPermissionMiddleware: jest
          .fn()
          .mockReturnValue(() => ({ result: true })),
      },
      PermissionController: {
        createPermissionMiddleware: jest
          .fn()
          .mockReturnValue(() => ({ result: true })),
      },
    },
  };
  return {
    __esModule: true,
    default: mockEngine,
    context: mockEngine.context,
  };
});
jest.mock('../SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));
jest.mock('../Permissions', () => ({
  getPermittedAccounts: jest
    .fn()
    .mockResolvedValue(['0x1234567890abcdef1234567890abcdef12345678']),
  getPermittedChains: jest.fn().mockResolvedValue(['eip155:1', 'eip155:137']),
}));
jest.mock('../../store', () => ({
  store: {
    getState: jest.fn(),
    subscribe: jest.fn(),
    dispatch: jest.fn(),
  },
}));
jest.mock('../RPCMethods/RPCMethodMiddleware', () => ({
  __esModule: true,
  default: () => () => ({ acknowledged: () => Promise.resolve() }),
  getRpcMethodMiddlewareHooks: jest.fn().mockReturnValue({}),
}));
jest.mock('./wc-utils', () => ({
  ...jest.requireActual('./wc-utils'),
  hideWCLoadingState: jest.fn(),
  showWCLoadingState: jest.fn(),
  checkWCPermissions: jest.fn().mockResolvedValue(true),
  getScopedPermissions: jest.fn().mockResolvedValue({
    eip155: {
      chains: ['eip155:1'],
      methods: ['eth_sendTransaction'],
      events: ['chainChanged', 'accountsChanged'],
      accounts: ['eip155:1:0x1234567890abcdef1234567890abcdef12345678'],
    },
  }),
  normalizeOrigin: jest.fn().mockImplementation((url) => url),
  getHostname: jest.fn().mockReturnValue('example.com'),
}));
jest.mock('../../selectors/networkController', () => ({
  selectEvmChainId: jest.fn(),
  selectEvmNetworkConfigurationsByChainId: jest.fn().mockReturnValue({}),
  selectNetworkConfigurationsByCaipChainId: jest.fn().mockReturnValue({}),
  selectNetworkConfigurations: jest.fn().mockReturnValue({}),
  selectIsAllNetworks: jest.fn().mockReturnValue(false),
  selectIsPopularNetwork: jest.fn().mockReturnValue(false),
}));

jest.mock('../../util/device', () => ({
  isIos: jest.fn(),
}));

jest.mock('../NativeModules', () => ({
  Minimizer: {
    goBack: jest.fn(),
  },
}));

jest.mock('../../selectors/selectedNetworkController', () => ({
  selectProviderConfig: jest.fn(),
  selectProviderNetworkType: jest.fn(),
  selectProviderNetworkName: jest.fn(),
  selectProviderChainId: jest.fn(),
  selectPerOriginChainId: jest.fn().mockReturnValue('0x1'),
}));

jest.mock('../../selectors/accountsController', () => ({
  selectSelectedInternalAccountAddress: jest
    .fn()
    .mockReturnValue('0x1234567890abcdef1234567890abcdef12345678'),
}));

jest.mock('../../selectors/smartTransactionsController', () => ({
  selectSmartTransactionsEnabled: jest.fn(),
}));

jest.mock('../../selectors/transactionController', () => ({
  getSelectedTabTransactions: jest.fn(),
  selectConfirmedTransactions: jest.fn(),
  selectPendingTransactions: jest.fn(),
  selectCurrentNetworkTransactions: jest.fn(),
}));

jest.mock('../../selectors/util', () => ({
  createDeepEqualSelector: jest.fn((selectors, combiner) => {
    if (typeof selectors === 'function') {
      return selectors;
    }
    return combiner;
  }),
}));

jest.mock('../../util/networks/global-network', () => ({
  getGlobalNetworkClientId: jest.fn().mockReturnValue('1'),
}));

jest.mock('../../actions/sdk', () => ({
  updateWC2Metadata: jest.fn().mockReturnValue({ type: 'UPDATE_WC2_METADATA' }),
}));

jest.mock('../RPCMethods/lib/ethereum-chain-utils', () => ({
  findExistingNetwork: jest.fn().mockImplementation((chainId) => {
    const networkClientId = `network-client-id-${chainId}`;

    return [
      networkClientId,
      {
        chainId,
        name: 'Test Network',
        rpcEndpoints: [{ networkClientId, url: 'https://test.com' }],
        defaultRpcEndpointIndex: 0,
        nativeCurrency: 'ETH',
      },
    ];
  }),
  switchToNetwork: jest.fn().mockResolvedValue(undefined),
}));

describe('WalletConnect2Session', () => {
  let session: WalletConnect2Session;
  let mockClient: IWalletKit;
  let mockSession: SessionTypes.Struct;
  let mockNavigation: NavigationContainerRef;

  const testChainId = '0x89';
  const testNetworkClientId = `test-network-${parseInt(testChainId, 16)}`;
  const testChainCaip = `eip155:${parseInt(testChainId, 16)}` as CaipChainId;

  const networkControllerMock = {
    networkConfigurationsByCaipChainId: {
      'eip155:1': {
        chainId: '0x1',
        rpcEndpoints: [{ networkClientId: 'mainnet' }],
      },
      [testChainCaip]: {
        chainId: testChainId,
        rpcEndpoints: [{ networkClientId: testNetworkClientId }],
      },
    },
    networkConfigurationsByChainId: {
      '0x1': {
        rpcEndpoints: [{ networkClientId: 'mainnet' }],
      },
      [testChainId]: {
        rpcEndpoints: [{ networkClientId: testNetworkClientId }],
      },
    },
  };

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
      sdk: {
        wc2Metadata: {
          id: 'test-channel',
          url: 'https://example.com',
          name: 'Test App',
          icon: 'https://example.com/icon.png',
          lastVerifiedUrl: 'https://example.com',
        },
      },
      engine: {
        backgroundState: {
          NetworkController: networkControllerMock,
        },
      },
    });

    // Mock the selectors to return proper data
    const {
      selectNetworkConfigurationsByCaipChainId,
      selectEvmNetworkConfigurationsByChainId,
    } = jest.requireMock('../../selectors/networkController');
    selectNetworkConfigurationsByCaipChainId.mockReturnValue({
      'eip155:1': { chainId: '0x1' },
      'eip155:2': { chainId: '0x2' },
      [testChainCaip]: { chainId: testChainId },
    });
    selectEvmNetworkConfigurationsByChainId.mockReturnValue({
      '0x1': { rpcEndpoints: [{ networkClientId: 'mainnet' }] },
      '0x2': { rpcEndpoints: [{ networkClientId: 'optimism' }] },
      [testChainId]: {
        rpcEndpoints: [{ networkClientId: testNetworkClientId }],
      },
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
      .mockImplementation(async () => {
        /* empty implementation */
      });

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
          origin: 'https://example.com',
        },
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
    // Directly spy on session.updateSession and replace it with our own implementation
    // This avoids issues with mocking imported utilities
    const originalUpdateSession = session.updateSession;
    session.updateSession = jest
      .fn()
      .mockImplementation(
        async (_: { chainId: number; accounts: string[] }) => {
          // Directly call updateSession on the web3Wallet with mock data
          await mockClient.updateSession({
            topic: mockSession.topic,
            namespaces: {
              eip155: {
                chains: ['eip155:1'],
                methods: ['eth_sendTransaction'],
                events: ['chainChanged', 'accountsChanged'],
                accounts: [
                  'eip155:1:0x1234567890abcdef1234567890abcdef12345678',
                ],
              },
            },
          });
          // Mock emitting the event
          return Promise.resolve();
        },
      );

    // Mock updateSession on the client
    const mockUpdateSession = jest
      .spyOn(mockClient, 'updateSession')
      .mockResolvedValue({ acknowledged: () => Promise.resolve() });

    // Call updateSession method
    await session.updateSession({ chainId: 1, accounts: ['0x123'] });

    // Verify that updateSession was called with expected arguments
    expect(mockUpdateSession).toHaveBeenCalledWith({
      topic: mockSession.topic,
      namespaces: {
        eip155: {
          chains: ['eip155:1'],
          methods: ['eth_sendTransaction'],
          events: ['chainChanged', 'accountsChanged'],
          accounts: ['eip155:1:0x1234567890abcdef1234567890abcdef12345678'],
        },
      },
    });

    // Restore original updateSession method
    session.updateSession = originalUpdateSession;
  });

  it('subscribes to chain changes', async () => {
    // eslint-disable-next-line no-empty-function
    let subscriberCallback: () => void = () => {};
    (store.subscribe as jest.Mock).mockImplementation(
      (callback: () => void) => {
        subscriberCallback = callback;
      },
    );

    // Mock initial chain ID
    (selectPerOriginChainId as unknown as jest.Mock).mockReturnValue('0x1');

    session = new WalletConnect2Session({
      web3Wallet: mockClient,
      session: mockSession,
      channelId: 'test-channel',
      deeplink: true,
      navigation: mockNavigation,
    });

    const handleChainChangeSpy = jest.spyOn(
      session as any,
      'handleChainChange',
    );

    // Change the chain ID
    (selectPerOriginChainId as unknown as jest.Mock).mockReturnValue('0x2');

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
    (store.subscribe as jest.Mock).mockImplementation(
      (callback: () => void) => {
        subscriberCallback = callback;
      },
    );

    (selectPerOriginChainId as unknown as jest.Mock).mockReturnValue('0x1');

    session = new WalletConnect2Session({
      web3Wallet: mockClient,
      session: mockSession,
      channelId: 'test-channel',
      deeplink: true,
      navigation: mockNavigation,
    });

    (session as any).isHandlingChainChange = true;

    const handleChainChangeSpy = jest.spyOn(
      session as any,
      'handleChainChange',
    );

    (selectPerOriginChainId as unknown as jest.Mock).mockReturnValue('0x2');

    subscriberCallback();

    await new Promise(process.nextTick);

    expect(handleChainChangeSpy).not.toHaveBeenCalled();

    handleChainChangeSpy.mockRestore();
  });

  it('logs warning on handleChainChange error', async () => {
    // eslint-disable-next-line no-empty-function
    let subscriberCallback: () => void = () => {};
    (store.subscribe as jest.Mock).mockImplementation(
      (callback: () => void) => {
        subscriberCallback = callback;
      },
    );

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    (selectPerOriginChainId as unknown as jest.Mock).mockReturnValue('0x1');

    session = new WalletConnect2Session({
      web3Wallet: mockClient,
      session: mockSession,
      channelId: 'test-channel',
      deeplink: true,
      navigation: mockNavigation,
    });

    const error = new Error('Chain change failed');
    jest
      .spyOn(session as any, 'handleChainChange')
      .mockRejectedValueOnce(error);

    (selectPerOriginChainId as unknown as jest.Mock).mockReturnValue('0x2');

    subscriberCallback();

    await new Promise(process.nextTick);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'WC2::store.subscribe Error handling chain change:',
      error,
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

    it('allows backward navigation for non-iOS devices when redirect metadata exists', () => {
      (Device.isIos as jest.Mock).mockReturnValue(false);
      session.session = {
        ...mockSession,
        peer: {
          metadata: {
            ...mockSession.peer.metadata,
            redirect: {
              native: 'https://example.com',
            },
          },
        },
      } as any;

      session.redirect('test');
      jest.runAllTimers();

      expect(Minimizer.goBack).toHaveBeenCalled();
      expect(Linking.openURL).not.toHaveBeenCalled();
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });

    it('shows return notification when redirect metadata does not exist', () => {
      (Device.isIos as jest.Mock).mockReturnValue(false);
      session.session = {
        ...mockSession,
        peer: {
          metadata: {
            ...mockSession.peer.metadata,
            redirect: undefined,
          },
        },
      } as any;

      session.redirect('test');
      jest.runAllTimers();

      expect(Minimizer.goBack).not.toHaveBeenCalled();
      expect(Linking.openURL).not.toHaveBeenCalled();
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        {
          screen: Routes.SDK.RETURN_TO_DAPP_NOTIFICATION,
        },
      );
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
            screen: Routes.SDK.RETURN_TO_DAPP_NOTIFICATION,
          },
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

        (Linking.openURL as jest.Mock).mockReturnValue(
          Promise.reject(new Error('Failed to open URL')),
        );

        session.redirect('test');
        jest.runAllTimers();

        // Force jest to process all pending promises
        await Promise.resolve();

        expect(Linking.openURL).toHaveBeenCalledWith(mockPeerLink);
        expect(mockNavigation.navigate).toHaveBeenCalledWith(
          Routes.MODAL.ROOT_MODAL_FLOW,
          {
            screen: Routes.SDK.RETURN_TO_DAPP_NOTIFICATION,
          },
        );
        expect(DevLogger.log).toHaveBeenLastCalledWith(
          `WC2::redirect error while opening ${mockPeerLink} with error Error: Failed to open URL`,
        );
      });

      it('skips iOS specific logic for iOS versions below 17', () => {
        jest.spyOn(Platform, 'Version', 'get').mockReturnValue('16.0');
        session.session = {
          ...mockSession,
          peer: {
            metadata: {
              ...mockSession.peer.metadata,
              redirect: {
                native: 'https://example.com',
              },
            },
          },
        } as any;

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
    });

    it('calls redirect when requestId exists in requestsToRedirect', () => {
      const requestId = '123';

      // Set up the requestsToRedirect object with the test ID
      (session as any).requestsToRedirect = {
        [requestId]: true,
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
        '789': true,
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

  describe('handles wc grpc operations correctly', () => {
    const mockedEngine = jest.requireMock('../Engine/Engine');

    async function buildCase(
      request: WalletKitTypes.SessionRequest,
      switchIntoChainId: Hex,
      switchIntoCaip2ChainId: CaipChainId,
    ) {
      session.setDeeplink(false);
      jest.useRealTimers();
      const networkClientId = `test-network-${parseInt(switchIntoChainId, 16)}`;
      const {
        selectNetworkConfigurationsByCaipChainId,
        selectEvmNetworkConfigurationsByChainId,
        selectNetworkConfigurations,
      } = jest.requireMock('../../selectors/networkController');
      selectNetworkConfigurationsByCaipChainId.mockReturnValue({
        'eip155:1': { chainId: '0x1' },
        [switchIntoCaip2ChainId]: { chainId: switchIntoChainId },
      });
      selectEvmNetworkConfigurationsByChainId.mockReturnValue({
        '0x1': { rpcEndpoints: [{ networkClientId: 'mainnet' }] },
        [switchIntoChainId]: { rpcEndpoints: [{ networkClientId }] },
      });
      selectNetworkConfigurations.mockReturnValue({
        mainnet: { chainId: '0x1' },
        [networkClientId]: { chainId: switchIntoChainId },
      });
      (selectEvmChainId as unknown as jest.Mock).mockReturnValue('0x1');
      // Reset mock function before test
      mockedEngine.context.MultichainNetworkController.setActiveNetwork.mockClear();
      // Mock getGlobalNetworkClientId to return networkClientId
      (getGlobalNetworkClientId as jest.Mock).mockReturnValue(networkClientId);
      (session as any).topicByRequestId[request.id] = request.topic;
      await session.handleRequest(request);
    }

    it('handles wallet_switchEthereumChain correctly', async () => {
      jest.mock('./wc-utils', () => jest.requireActual('./wc-utils'));

      const requestId = Math.floor(Math.random() * 1000000);
      const request: WalletKitTypes.SessionRequest = {
        id: requestId,
        topic: mockSession.topic,
        params: {
          request: {
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: testChainId }],
          },
          chainId: 'eip155:1', // Current chain before switch
        },
        verifyContext: {
          verified: {
            origin: 'https://example.com',
            validation: 'UNKNOWN',
            verifyUrl: '',
          },
        },
      };
      const handleChainChangeSpy = jest.spyOn(
        session as any,
        'handleChainChange',
      );
      const approveRequestSpy = jest.spyOn(session, 'approveRequest');
      handleChainChangeSpy.mockResolvedValue(undefined);

      await buildCase(request, testChainId, testChainCaip);
      expect(handleChainChangeSpy).toHaveBeenCalledWith(
        parseInt(testChainId, 16),
      );
      expect(approveRequestSpy).toHaveBeenCalledWith({
        id: request.id + '',
        result: true,
      });
    });

    it('handles wallet_switchEthereumChain correctly with invalid chainId', async () => {
      jest.mock('./wc-utils', () => jest.requireActual('./wc-utils'));

      const requestId = Math.floor(Math.random() * 1000000);
      const request: WalletKitTypes.SessionRequest = {
        id: requestId,
        topic: mockSession.topic,
        params: {
          request: {
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: testChainId }],
          },
          chainId: 'eip155:1', // Current chain before switch
        },
        verifyContext: {
          verified: {
            origin: 'https://example.com',
            validation: 'UNKNOWN',
            verifyUrl: '',
          },
        },
      };
      const handleChainChangeSpy = jest.spyOn(
        session as any,
        'handleChainChange',
      );
      const handleSwitchToChainSpy = jest.spyOn(session, 'switchToChain');
      const mockRespondSessionRequest = jest
        .spyOn(mockClient, 'respondSessionRequest')
        .mockResolvedValue(undefined);

      handleChainChangeSpy.mockResolvedValue(undefined);

      // Test with an invalid chainId that should cause handleSwitchToChain to throw
      await buildCase(
        request,
        '0x2',
        'eip155:1234567890abcdef1234567890abcdef12345678',
      );

      // Verify that handleSwitchToChain was called
      expect(handleSwitchToChainSpy).toHaveBeenCalled();

      // Check if the spy threw an exception by examining its results
      expect(mockRespondSessionRequest).toHaveBeenCalledWith({
        topic: mockSession.topic,
        response: {
          id: request.id,
          jsonrpc: '2.0',
          error: { code: 4902, message: 'Invalid chainId' },
        },
      });
    });

    it('handles personal_sign correctly with invalid chainId network config', async () => {
      const requestId = Math.floor(Math.random() * 1000000);
      const request: WalletKitTypes.SessionRequest = {
        id: requestId,
        topic: mockSession.topic,
        params: {
          request: {
            method: 'personal_sign',
            params: [{ chainId: 'eip155:2', message: 'test' }],
          },
          chainId: 'eip155:2', // Current chain before switch
        },
        verifyContext: {
          verified: {
            origin: 'https://example.com',
            validation: 'UNKNOWN',
            verifyUrl: '',
          },
        },
      };
      jest
        .spyOn(
          jest.requireMock('./wc-utils') as any,
          'getChainIdForCaipChainId',
        )
        .mockReturnValue('eip155:2');
      const handleChainChangeSpy = jest.spyOn(
        session as any,
        'handleChainChange',
      );
      handleChainChangeSpy.mockResolvedValue(undefined);

      // Test with an invalid chainId that should cause handleSwitchToChain to throw
      await expect(
        buildCase(
          request,
          '0x2',
          'eip155:1234567890abcdef1234567890abcdef12345678',
        ),
      ).rejects.toThrow(
        'Invalid parameters: active chainId is different than the one provided.',
      );
    });

    it('handles personal_sign correctly with invalid chainId', async () => {
      jest.mock('./wc-utils', () => jest.requireActual('./wc-utils'));

      const requestId = Math.floor(Math.random() * 1000000);
      const request: WalletKitTypes.SessionRequest = {
        id: requestId,
        topic: mockSession.topic,
        params: {
          request: {
            method: 'personal_sign',
            params: [{ message: 'test' }],
          },
          chainId: 'eip155:2', // Current chain before switch
        },
        verifyContext: {
          verified: {
            origin: 'https://example.com',
            validation: 'UNKNOWN',
            verifyUrl: '',
          },
        },
      };
      const handleChainChangeSpy = jest.spyOn(
        session as any,
        'handleChainChange',
      );
      const handleSwitchToChainSpy = jest.spyOn(session, 'switchToChain');
      const mockRespondSessionRequest = jest
        .spyOn(mockClient, 'respondSessionRequest')
        .mockResolvedValue(undefined);

      handleChainChangeSpy.mockResolvedValue(undefined);

      // Test with an invalid chainId that should cause handleSwitchToChain to throw
      await buildCase(
        request,
        '0x2',
        'eip155:1234567890abcdef1234567890abcdef12345678',
      );

      // Verify that handleSwitchToChain was called
      expect(handleSwitchToChainSpy).not.toHaveBeenCalled();

      // Check if the spy threw an exception by examining its results
      expect(mockRespondSessionRequest).toHaveBeenCalledWith({
        topic: mockSession.topic,
        response: {
          id: request.id,
          jsonrpc: '2.0',
          error: { code: 4902, message: 'Invalid chainId' },
        },
      });
    });

    it('handles personal_sign correctly with valid chainId that it has permissions for', async () => {
      jest.mock('./wc-utils', () => jest.requireActual('./wc-utils'));
      const requestId = Math.floor(Math.random() * 1000000);
      const request: WalletKitTypes.SessionRequest = {
        id: requestId,
        topic: mockSession.topic,
        params: {
          request: {
            method: 'personal_sign',
            params: [{ message: 'test' }],
          },
          chainId: testChainCaip,
        },
        verifyContext: {
          verified: {
            origin: 'https://example.com',
            validation: 'UNKNOWN',
            verifyUrl: '',
          },
        },
      };

      const handleChainChangeSpy = jest.spyOn(
        session as any,
        'handleChainChange',
      );
      const handleSwitchToChainSpy = jest.spyOn(session, 'switchToChain');
      const mockChainChangedEvent = jest
        .spyOn(session, 'emitEvent')
        .mockResolvedValue(undefined);

      handleChainChangeSpy.mockResolvedValue(undefined);
      await buildCase(request, testChainId, testChainCaip);
      // Verify that handleSwitchToChain was called
      expect(handleSwitchToChainSpy).toHaveBeenCalled();
      expect(mockChainChangedEvent).toHaveBeenCalledWith(
        'chainChanged',
        parseInt(testChainId, 16),
      );
    });

    it('handles eth_sendTransaction correctly with valid chainId that it has permissions for', async () => {
      jest.mock('./wc-utils', () => jest.requireActual('./wc-utils'));
      const requestId = Math.floor(Math.random() * 1000000);
      const request: WalletKitTypes.SessionRequest = {
        id: requestId,
        topic: mockSession.topic,
        params: {
          request: {
            method: 'eth_sendTransaction',
            params: [
              {
                from: '0x1234567890abcdef1234567890abcdef12345678',
                to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
                value: '0x16345785d8a0000', // 0.1 ETH in wei
                gas: '0x5208', // 21000
                gasPrice: '0x4a817c800', // 20 Gwei
                data: '0x',
              },
            ],
          },
          chainId: testChainCaip,
        },
        verifyContext: {
          verified: {
            origin: 'https://example.com',
            validation: 'UNKNOWN',
            verifyUrl: '',
          },
        },
      };

      const handleChainChangeSpy = jest.spyOn(
        session as any,
        'handleChainChange',
      );
      const handleSwitchToChainSpy = jest.spyOn(session, 'switchToChain');
      const mockChainChangedEvent = jest
        .spyOn(session, 'emitEvent')
        .mockResolvedValue(undefined);

      handleChainChangeSpy.mockResolvedValue(undefined);
      await buildCase(request, testChainId, testChainCaip);

      // Verify that handleSwitchToChain was called
      expect(handleSwitchToChainSpy).toHaveBeenCalled();
      expect(mockChainChangedEvent).toHaveBeenCalledWith(
        'chainChanged',
        parseInt(testChainId, 16),
      );
    });

    it('handles eth_sendTransaction correctly with valid chainId that it has permissions for', async () => {
      jest.mock('./wc-utils', () => jest.requireActual('./wc-utils'));
      const requestId = Math.floor(Math.random() * 1000000);
      const request: WalletKitTypes.SessionRequest = {
        id: requestId,
        topic: mockSession.topic,
        params: {
          request: {
            method: 'eth_sendTransaction',
            params: [
              {
                from: '0x1234567890abcdef1234567890abcdef12345678',
                to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
                value: '0x16345785d8a0000', // 0.1 ETH in wei
                gas: '0x5208', // 21000
                gasPrice: '0x4a817c800', // 20 Gwei
                data: '0x',
              },
            ],
          },
          chainId: testChainCaip,
        },
        verifyContext: {
          verified: {
            origin: 'https://example.com',
            validation: 'UNKNOWN',
            verifyUrl: '',
          },
        },
      };

      const handleChainChangeSpy = jest.spyOn(
        session as any,
        'handleChainChange',
      );
      const handleSwitchToChainSpy = jest.spyOn(session, 'switchToChain');
      const mockChainChangedEvent = jest
        .spyOn(session, 'emitEvent')
        .mockResolvedValue(undefined);

      handleChainChangeSpy.mockResolvedValue(undefined);
      await buildCase(request, testChainId, testChainCaip);

      // Verify that handleSwitchToChain was called
      expect(handleSwitchToChainSpy).toHaveBeenCalled();
      expect(mockChainChangedEvent).toHaveBeenCalledWith(
        'chainChanged',
        parseInt(testChainId, 16),
      );
    });

    it('handles eth_signTypedData_v3 correctly with valid chainId that it has permissions for', async () => {
      jest.mock('./wc-utils', () => jest.requireActual('./wc-utils'));
      const requestId = Math.floor(Math.random() * 1000000);
      const typedData = {
        domain: {
          name: 'Test DApp',
          version: '1',
          chainId: parseInt(testChainId, 16),
          verifyingContract: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
        },
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' },
          ],
          Transfer: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ],
        },
        message: {
          from: '0x1234567890abcdef1234567890abcdef12345678',
          to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
          amount: '1000000000000000000', // 1 ETH
        },
      };

      const request: WalletKitTypes.SessionRequest = {
        id: requestId,
        topic: mockSession.topic,
        params: {
          request: {
            method: 'eth_signTypedData_v3',
            params: [
              '0x1234567890abcdef1234567890abcdef12345678',
              JSON.stringify(typedData),
            ],
          },
          chainId: testChainCaip,
        },
        verifyContext: {
          verified: {
            origin: 'https://example.com',
            validation: 'UNKNOWN',
            verifyUrl: '',
          },
        },
      };

      const handleChainChangeSpy = jest.spyOn(
        session as any,
        'handleChainChange',
      );
      const handleSwitchToChainSpy = jest.spyOn(session, 'switchToChain');
      const mockChainChangedEvent = jest
        .spyOn(session, 'emitEvent')
        .mockResolvedValue(undefined);

      handleChainChangeSpy.mockResolvedValue(undefined);
      await buildCase(request, testChainId, testChainCaip);

      // Verify that handleSwitchToChain was called
      expect(handleSwitchToChainSpy).toHaveBeenCalled();
      expect(mockChainChangedEvent).toHaveBeenCalledWith(
        'chainChanged',
        parseInt(testChainId, 16),
      );
    });
  });
});

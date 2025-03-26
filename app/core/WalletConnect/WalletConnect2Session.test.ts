/* eslint-disable @typescript-eslint/no-explicit-any */
import WalletConnect2Session from './WalletConnect2Session';
import { NavigationContainerRef } from '@react-navigation/native';
import { IWalletKit } from '@reown/walletkit';
import { SessionTypes } from '@walletconnect/types';
import { store } from '../../store';
import Engine from '../Engine';

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
    mockNavigation = {} as NavigationContainerRef;

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
  });

  it('should initialize correctly in constructor', () => {
    expect(session).toBeTruthy();
    expect((session as any).topicByRequestId).toEqual({
      '1': mockSession.topic,
    });
  });

  it('should set deeplink correctly', () => {
    session.setDeeplink(false);
    expect((session as any).deeplink).toBe(false);
  });

  it('should handle request correctly and reject invalid chainId', async () => {
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

  it('should remove listeners correctly', async () => {
    const mockOnDisconnect = jest.spyOn(
      (session as any).backgroundBridge,
      'onDisconnect',
    );

    await session.removeListeners();

    expect(mockOnDisconnect).toHaveBeenCalled();
  });

  it('should approve a request correctly', async () => {
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

  it('should reject a request correctly', async () => {
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

  it('should handle session update correctly', async () => {
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
});

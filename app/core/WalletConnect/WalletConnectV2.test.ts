/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
import { ERROR_MESSAGES, WC2Manager } from './WalletConnectV2';
import StorageWrapper from '../../store/storage-wrapper';
import AppConstants from '../AppConstants';
import { IWalletKit } from '@reown/walletkit';
import WalletConnect from './WalletConnect';
import WalletConnect2Session from './WalletConnect2Session';
// eslint-disable-next-line import/no-namespace
import * as wcUtils from './wc-utils';
import Engine from '../Engine';
import { SessionTypes } from '@walletconnect/types';
import { Core } from '@walletconnect/core';
import Routes from '../../constants/navigation/Routes';

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
  DEEPLINKS: {
    ORIGIN_DEEPLINK: 'deeplink-origin',
  },
}));

const mockNavigation = {
  getCurrentRoute: jest.fn().mockReturnValue({ name: 'Home' }),
  navigate: jest.fn(),
  canGoBack: jest.fn(),
  goBack: jest.fn(),
} as any;

jest.mock('../NavigationService', () => ({
  __esModule: true,
  default: {
    get navigation() {
      return mockNavigation;
    },
    set navigation(value) {
      // Mock setter - does nothing but prevents errors
    },
  },
}));

jest.mock('@reown/walletkit', () => {
  const mockClient = {
    approveRequest: jest.fn(),
    rejectRequest: jest.fn(),
    updateSession: jest.fn().mockResolvedValue(true),
    getPendingSessionRequests: jest.fn(),
    getPendingSessionProposals: jest.fn(),
    emitSessionEvent: jest.fn(),
    getActiveSessions: jest.fn().mockReturnValue({
      'test-topic': {
        topic: 'test-topic',
        pairingTopic: 'test-pairing',
        peer: {
          metadata: { url: 'https://example.com', name: 'Test App', icons: [] },
        },
      },
    }),
    approveSession: jest.fn(),
    rejectSession: jest.fn(),
    disconnectSession: jest.fn(function ({ topic }) {
      delete this.sessions?.[topic];
      return Promise.resolve(true);
    }),
    on: jest.fn(),
    respondSessionRequest: jest.fn(),
    core: {
      pairing: {
        pair: jest.fn().mockResolvedValue({
          topic: 'test-topic',
          expiry: 10000000,
          relay: {
            protocol: 'irn',
          },
          active: true,
          peerMetadata: {
            name: 'Test App',
            description: 'Test App Description',
            url: 'https://example.com',
            icons: ['https://example.com/icon.png'],
          },
          methods: ['eth_sendTransaction'],
        }),
      },
    },
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
    SingleEthereum: {
      init: jest.fn().mockResolvedValue(mockClient),
    },
  };
});

jest.mock('../Engine', () => ({
  context: {
    AccountsController: {
      getSelectedAccount: jest.fn().mockReturnValue({
        address: '0x1234567890abcdef1234567890abcdef12345678',
      }),
    },
    KeyringController: {
      isUnlocked: jest.fn().mockReturnValue(true),
    },
    PermissionController: {
      requestPermissions: jest.fn().mockResolvedValue(true),
      getPermission: jest.fn().mockReturnValue({
        id: 'mockPermissionId',
      }),
      revokeAllPermissions: jest.fn(),
      getCaveat: jest
        .fn()
        .mockImplementation((_origin, permissionName, caveatType) => {
          if (
            permissionName === 'endowment:caip25' &&
            caveatType === 'caip25'
          ) {
            return {
              type: 'caip25',
              value: {
                requiredScopes: {},
                optionalScopes: {
                  'eip155:1': {
                    methods: [
                      'eth_sendTransaction',
                      'eth_signTransaction',
                      'eth_sign',
                    ],
                    notifications: ['eth_subscription'],
                    accounts: [
                      'eip155:1:0x1234567890abcdef1234567890abcdef12345678',
                    ],
                  },
                },
                sessionProperties: {},
                isMultichainOrigin: false,
              },
            };
          }
          return null;
        }),
      updateCaveat: jest.fn(),
    },
  },
}));

jest.mock('../Permissions', () => ({
  ...jest.requireActual('../Permissions'),
  getPermittedAccounts: jest
    .fn()
    .mockReturnValue(['0x1234567890abcdef1234567890abcdef12345678']),
  getPermittedChains: jest.fn().mockResolvedValue(['eip155:1']),
  updatePermittedChains: jest.fn(),
}));

jest.mock('../../selectors/networkController', () => ({
  selectEvmChainId: jest.fn().mockReturnValue('0x1'),
  selectProviderConfig: jest.fn().mockReturnValue({
    type: 'mainnet',
    chainId: '0x1',
    ticker: 'ETH',
  }),
  selectEvmNetworkConfigurationsByChainId: jest.fn().mockReturnValue({}),
  selectSelectedNetworkClientId: jest.fn().mockReturnValue('mainnet'),
  selectNetworkClientId: jest.fn().mockReturnValue('mainnet'),
  selectRpcUrl: jest.fn().mockReturnValue('https://mainnet.infura.io/v3/123'),
}));

jest.mock('../../core/Multichain/utils', () => ({
  isNonEvmChainId: jest.fn().mockReturnValue(false),
}));

jest.mock('../../store/storage-wrapper', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
}));

jest.mock('./WalletConnect2Session', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    updateSession: jest.fn(),
    handleRequest: jest.fn(),
    removeListeners: jest.fn(),
    setDeeplink: jest.fn(),
    isHandlingRequest: jest.fn().mockReturnValue(false),
    getCurrentChainId: jest.fn().mockReturnValue('0x1'),
    getAllowedChainIds: ['eip155:1'],
  })),
}));

jest.mock('../BackgroundBridge/BackgroundBridge', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    inpageProvider: {},
  })),
}));

jest.mock('./WalletConnect', () => ({
  newSession: jest.fn().mockResolvedValue({}),
}));

jest.mock('./wc-utils', () => ({
  ...jest.requireActual('./wc-utils'),
  getScopedPermissions: jest.fn().mockResolvedValue({
    eip155: {
      chains: ['eip155:1'],
      methods: ['eth_sendTransaction', 'eth_signTransaction', 'eth_sign'],
      events: ['chainChanged', 'accountsChanged'],
      accounts: ['eip155:1:0x1234567890abcdef1234567890abcdef12345678'],
    },
  }),
  showWCLoadingState: jest.fn(),
  hideWCLoadingState: jest.fn(),
}));

jest.mock('@walletconnect/core', () => ({
  Core: jest.fn().mockImplementation((opts) => ({
    projectId: opts?.projectId,
    logger: opts?.logger,
  })),
}));

describe('WC2Manager', () => {
  let manager: WC2Manager;
  let mockApproveSession: jest.SpyInstance;
  const _sessions: { [topic: string]: WalletConnect2Session } = {};

  beforeEach(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (WC2Manager as any).instance = undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (WC2Manager as any)._initialized = false;
    const initResult = await WC2Manager.init({
      sessions: _sessions,
    });
    if (!initResult) {
      throw new Error('Failed to initialize WC2Manager');
    }
    manager = initResult;

    // Access private property for testing using unknown cast
    const web3Wallet = (manager as unknown as { web3Wallet: IWalletKit })
      .web3Wallet;
    mockApproveSession = jest.spyOn(web3Wallet, 'approveSession');
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset WC2Manager singleton state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (WC2Manager as any).instance = undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (WC2Manager as any)._initialized = false;
  });

  it('should correctly handle a session proposal', async () => {
    mockApproveSession.mockResolvedValue({
      topic: 'test-topic',
      pairingTopic: 'test-pairing',
      peer: {
        metadata: { url: 'https://example.com', name: 'Test App', icons: [] },
      },
    });

    const mockSessionProposal = {
      id: 1,
      params: {
        id: 1,
        pairingTopic: 'test-pairing',
        proposer: {
          publicKey: 'test-public-key',
          metadata: {
            name: 'Test App',
            description: 'Test App',
            url: 'https://example.com',
            icons: ['https://example.com/icon.png'],
          },
        },
        expiryTimestamp: Date.now() + 300000,
        relays: [{ protocol: 'irn' }],
        requiredNamespaces: {
          eip155: {
            chains: ['eip155:1'],
            methods: ['eth_sendTransaction'],
            events: ['chainChanged', 'accountsChanged'],
          },
        },
        optionalNamespaces: {},
      },
      verifyContext: {
        verified: {
          verifyUrl: 'https://example.com',
          validation: 'VALID' as const,
          origin: 'https://example.com',
        },
      },
    };

    await manager.onSessionProposal(mockSessionProposal);

    expect(mockApproveSession).toHaveBeenCalledWith({
      id: 1,
      namespaces: {
        eip155: {
          chains: ['eip155:1'],
          methods: expect.any(Array),
          events: ['chainChanged', 'accountsChanged'],
          accounts: ['eip155:1:0x1234567890abcdef1234567890abcdef12345678'],
        },
      },
    });
  });

  describe('WC2Manager Initialization', () => {
    it('should initialize correctly when called with valid inputs', async () => {
      const result = await WC2Manager.init({});
      expect(result).toBeInstanceOf(WC2Manager);
    });
  });

  describe('WC2Manager Sessions', () => {
    it('should return active sessions', () => {
      const sessions = manager.getSessions();
      expect(sessions.length).toBeGreaterThan(0);
      expect(sessions[0].topic).toEqual('test-topic');
    });

    it('should return the correct session for a given topic', () => {
      const session = manager.getSession('test-topic');
      expect(session).toBeDefined();
      expect(session?.topic).toEqual('test-topic');
    });

    it('should return undefined for a non-existent topic', () => {
      const session = manager.getSession('non-existent-topic');
      expect(session).toBeUndefined();
    });
  });

  describe('WC2Manager connect', () => {
    it('includes v2 URIs in paired sessions', async () => {
      const mockWcUri = 'wc://testv2uri?sessionTopic=test-topic';

      await manager.connect({
        wcUri: mockWcUri,
        redirectUrl: 'https://example.com',
        origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
      });

      const pairedSessions = manager.getSessions();
      expect(pairedSessions.length).toBeGreaterThan(0);
    });

    it('does not connect if URI is invalid', async () => {
      const mockWcUri = 'invalid-uri';

      await manager.connect({
        wcUri: mockWcUri,
        redirectUrl: 'https://example.com',
        origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
      });

      const sessions = manager.getSessions();
      expect(sessions.length).toBe(1);
    });

    it('includes and stores deepink session', async () => {
      const mockWcUri =
        'wc:7f6e504bfad60b485450578e05678441fa7a8ea2b3d7d678ef6c72a2efe0f6ad@2?relay-protocol=irn&symKey=587d5484ce2a2a6ee3ba1962fdd7e8588e06200c46823bd18fbd67def96ad303';

      const storageSpy = jest.spyOn(StorageWrapper, 'setItem');

      await manager.connect({
        wcUri: mockWcUri,
        redirectUrl: 'https://example.com',
        origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
      });

      const pairedSessions = manager.getSessions();
      expect(pairedSessions.length).toBeGreaterThan(0);

      expect(storageSpy).toHaveBeenCalledWith(
        AppConstants.WALLET_CONNECT.DEEPLINK_SESSIONS,
        expect.any(String),
      );
    });

    it('shows loading indicator for existing sessionTopic connections', async () => {
      const mockWcUri = 'wc://test@2?sessionTopic=test-topic';
      const showLoadingSpy = jest.spyOn(wcUtils, 'showWCLoadingState');

      await manager.connect({
        wcUri: mockWcUri,
        redirectUrl: 'https://example.com',
        origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
      });

      expect(showLoadingSpy).toHaveBeenCalledTimes(1);
    });

    it('creates new session for WalletConnect v1 URIs', async () => {
      const mockWcUri = 'wc:00e46b69-d0cc-4b3e-b6a2-cee442f97188@1';
      const WalletConnectSpy = jest.spyOn(WalletConnect, 'newSession');

      await manager.connect({
        wcUri: mockWcUri,
        redirectUrl: 'https://example.com',
        origin: 'qrcode',
      });

      expect(WalletConnectSpy).toHaveBeenCalledWith(
        mockWcUri,
        'https://example.com',
        false,
        'qrcode',
      );
    });

    it('logs a warning to console on invalid URIs', async () => {
      const mockWcUri = 'invalid:uri';
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await manager.connect({
        wcUri: mockWcUri,
        redirectUrl: 'https://example.com',
        origin: 'qrcode',
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('WC2Manager session request handling', () => {
    let mockWeb3Wallet: IWalletKit;

    beforeEach(() => {
      mockWeb3Wallet = (manager as unknown as { web3Wallet: IWalletKit })
        .web3Wallet;
    });

    it('should handle session requests through event emission', async () => {
      // Get the callback that was registered for 'session_request'
      const sessionRequestCallback = (
        mockWeb3Wallet.on as jest.Mock
      ).mock.calls.find(([event]) => event === 'session_request')?.[1];

      expect(sessionRequestCallback).toBeDefined();

      const mockRequest = {
        topic: 'test-topic',
        id: 1,
        params: {
          request: {
            method: 'eth_sendTransaction',
            params: [],
          },
        },
        verifyContext: {
          verified: {
            verifyUrl: 'https://example.com',
            validation: 'VALID' as const,
            origin: 'https://example.com',
          },
        },
      };

      // Call the callback directly
      await sessionRequestCallback(mockRequest);

      const session = manager.getSession('test-topic');
      expect(session).toBeDefined();
    });

    it('rejects invalid session requests through event emission', async () => {
      const sessionRequestCallback = (
        mockWeb3Wallet.on as jest.Mock
      ).mock.calls.find(([event]) => event === 'session_request')?.[1];

      expect(sessionRequestCallback).toBeDefined();

      const mockRequest = {
        topic: 'invalid-topic',
        id: 1,
        params: {
          request: {
            method: 'eth_sendTransaction',
            params: [],
          },
        },
        verifyContext: {
          verified: {
            verifyUrl: 'https://example.com',
            validation: 'VALID' as const,
            origin: 'https://example.com',
          },
        },
      };

      const respondSpy = jest.spyOn(mockWeb3Wallet, 'respondSessionRequest');

      // Call the callback directly
      await sessionRequestCallback(mockRequest);

      expect(respondSpy).toHaveBeenCalledWith({
        topic: 'invalid-topic',
        response: {
          id: 1,
          jsonrpc: '2.0',
          error: { code: 1, message: ERROR_MESSAGES.INVALID_ID },
        },
      });
    });

    it('logs an error to console on session request error', async () => {
      const sessionRequestCallback = (
        mockWeb3Wallet.on as jest.Mock
      ).mock.calls.find(([event]) => event === 'session_request')?.[1];

      const mockRequest = {
        topic: 'test-topic',
        id: 1,
        params: {
          request: {
            method: 'eth_sendTransaction',
            params: [],
          },
        },
        verifyContext: {
          verified: {
            verifyUrl: 'https://example.com',
            validation: 'VALID' as const,
            origin: 'https://example.com',
          },
        },
      };

      // Mock an error in session handling
      const session = manager.getSession('test-topic');
      if (session) {
        const mockSession = _sessions[session.topic];
        mockSession.handleRequest = jest
          .fn()
          .mockRejectedValue(new Error('Test error'));
      }

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await sessionRequestCallback(mockRequest);

      expect(consoleSpy).toHaveBeenCalledWith(
        'WC2::onSessionRequest() Error while handling request',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('WC2Manager removeSession', () => {
    it('should correctly remove a session and revoke permissions', async () => {
      const session = manager.getSession('test-topic');
      expect(session).toBeDefined();

      const revokeAllPermissionsSpy = jest.spyOn(
        Engine.context.PermissionController,
        'revokeAllPermissions',
      );

      await manager.removeSession(session as SessionTypes.Struct);

      const removedSession = manager.getSession('test-topic');
      expect(removedSession).toEqual({
        pairingTopic: 'test-pairing',
        peer: {
          metadata: { icons: [], name: 'Test App', url: 'https://example.com' },
        },
        topic: 'test-topic',
      });
      expect(revokeAllPermissionsSpy).toHaveBeenCalledWith('test-topic');
    });
  });

  describe('WC2Manager removeAll', () => {
    it('should remove all sessions and clear storage', async () => {
      const clearStorageSpy = jest.spyOn(StorageWrapper, 'setItem');

      await manager.removeAll();

      const sessions = manager.getSessions();
      expect(sessions.length).toEqual(1);
      expect(clearStorageSpy).toHaveBeenCalledWith(
        AppConstants.WALLET_CONNECT.DEEPLINK_SESSIONS,
        JSON.stringify({}),
      );
    });
  });

  describe('WC2Manager isWalletConnect', () => {
    it('returns true for valid WalletConnect origins', () => {
      const result = manager.isWalletConnect('https://example.com');
      expect(result).toBe(true);
    });

    it('returns false for invalid WalletConnect origins', () => {
      const result = manager.isWalletConnect('https://invalid.com');
      expect(result).toBe(false);
    });
  });

  describe('WC2Manager session proposal handling', () => {
    it('returns rejectSession event to wallet on proposal rejection', async () => {
      const mockPermissionController = Engine.context.PermissionController;
      (
        mockPermissionController.requestPermissions as jest.Mock
      ).mockRejectedValueOnce(new Error('User rejected'));

      const mockSessionProposal = {
        id: 1,
        params: {
          id: 1,
          pairingTopic: 'test-pairing',
          proposer: {
            publicKey: 'test-public-key',
            metadata: {
              name: 'Test App',
              description: 'Test App',
              url: 'https://example.com',
              icons: ['https://example.com/icon.png'],
            },
          },
          requiredNamespaces: {
            eip155: {
              chains: ['eip155:1'],
              methods: ['eth_sendTransaction'],
              events: ['chainChanged'],
            },
          },
          optionalNamespaces: {
            eip155: {
              chains: ['eip155:1'],
              methods: ['eth_sendTransaction'],
              events: ['chainChanged'],
            },
          },
          expiryTimestamp: 10000000,
          relays: [
            {
              protocol: 'irn',
            },
          ],
        },
        verifyContext: {
          verified: {
            verifyUrl: 'https://example.com',
            validation: 'VALID' as const,
            origin: 'https://example.com',
          },
        },
      };

      const mockWeb3Wallet = (manager as unknown as { web3Wallet: IWalletKit })
        .web3Wallet;
      const rejectSessionSpy = jest.spyOn(mockWeb3Wallet, 'rejectSession');

      await manager.onSessionProposal(mockSessionProposal);

      expect(rejectSessionSpy).toHaveBeenCalledWith({
        id: 1,
        reason: expect.any(Object),
      });
    });

    it('logs "invalid wallet status" error to console on session proposal with invalid wallet status', async () => {
      const mockSessionProposal = {
        id: 1,
        params: {
          id: 1,
          pairingTopic: 'test-pairing',
          proposer: {
            publicKey: 'test-public-key',
            metadata: {
              name: 'Test App',
              description: 'Test App',
              url: 'https://example.com',
              icons: ['https://example.com/icon.png'],
            },
          },
          requiredNamespaces: {
            eip155: {
              chains: ['eip155:1'],
              methods: ['eth_sendTransaction'],
              events: ['chainChanged'],
            },
          },
          optionalNamespaces: {
            eip155: {
              chains: ['eip155:1'],
              methods: ['eth_sendTransaction'],
              events: ['chainChanged'],
            },
          },
          expiryTimestamp: 10000000,
          relays: [
            {
              protocol: 'irn',
            },
          ],
        },
        verifyContext: {
          verified: {
            verifyUrl: 'https://example.com',
            validation: 'VALID' as const,
            origin: 'https://example.com',
          },
        },
      };

      // Mock approveSession to throw an error to trigger the catch block
      mockApproveSession.mockRejectedValueOnce(
        new Error('Session approval failed'),
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await manager.onSessionProposal(mockSessionProposal);

      expect(consoleSpy).toHaveBeenCalledWith(
        'invalid wallet status',
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });
  });

  describe('WC2Manager removePendings', () => {
    let mockWeb3Wallet: IWalletKit;
    let consoleSpy: jest.SpyInstance;
    const mockPendingProposalData = {
      expiryTimestamp: 10000000,
      relays: [
        {
          protocol: 'irn',
        },
      ],
      proposer: {
        publicKey: 'test-public-key',
        metadata: {
          name: 'Test App',
          description: 'Test App',
          url: 'https://example.com',
          icons: ['https://example.com/icon.png'],
        },
      },
      requiredNamespaces: {
        eip155: {
          methods: ['eth_sendTransaction'],
          events: ['chainChanged'],
          accounts: ['eip155:1:0x1234567890abcdef1234567890abcdef12345678'],
        },
      },
      optionalNamespaces: {
        eip155: {
          methods: ['eth_sendTransaction'],
          events: ['chainChanged'],
          accounts: ['eip155:1:0x1234567890abcdef1234567890abcdef12345678'],
        },
      },
      pairingTopic: 'test-pairing',
    };

    beforeEach(() => {
      mockWeb3Wallet = (manager as unknown as { web3Wallet: IWalletKit })
        .web3Wallet;
      consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('removes all pending session proposals', async () => {
      const mockPendingProposals = {
        '1': {
          id: 1,
          ...mockPendingProposalData,
        },
        '2': {
          id: 2,
          ...mockPendingProposalData,
        },
      };

      // Mock getPendingSessionProposals to return our test data
      jest
        .spyOn(mockWeb3Wallet, 'getPendingSessionProposals')
        .mockReturnValue(mockPendingProposals);

      const rejectSessionSpy = jest
        .spyOn(mockWeb3Wallet, 'rejectSession')
        .mockResolvedValue(undefined);

      rejectSessionSpy.mockClear();

      await manager.removePendings();

      expect(rejectSessionSpy).toHaveBeenCalledTimes(2);
      expect(rejectSessionSpy).toHaveBeenCalledWith({
        id: 1,
        reason: { code: 1, message: ERROR_MESSAGES.AUTO_REMOVE },
      });
      expect(rejectSessionSpy).toHaveBeenCalledWith({
        id: 2,
        reason: { code: 1, message: ERROR_MESSAGES.AUTO_REMOVE },
      });
    });

    it('logs errors to console when removing pending session proposals fails', async () => {
      const mockPendingProposals = {
        '1': { id: 1, ...mockPendingProposalData },
      };

      jest
        .spyOn(mockWeb3Wallet, 'getPendingSessionProposals')
        .mockReturnValue(mockPendingProposals);

      jest
        .spyOn(mockWeb3Wallet, 'rejectSession')
        .mockRejectedValue(new Error('Test error'));

      await manager.removePendings();

      expect(consoleSpy).toHaveBeenCalledWith(
        "Can't remove pending session 1",
        expect.any(Error),
      );
    });

    it('removes all pending session requests', async () => {
      const mockPendingRequests = [
        {
          id: 1,
          topic: 'topic1',
          params: {
            request: { method: 'eth_sendTransaction', params: [] },
            chainId: '0x1',
          },
          verifyContext: {
            verified: {
              verifyUrl: 'https://example.com',
              validation: 'VALID' as const,
              origin: 'https://example.com',
            },
          },
        },
        {
          id: 2,
          topic: 'topic2',
          params: {
            request: { method: 'eth_sendTransaction', params: [] },
            chainId: '0x1',
          },
          verifyContext: {
            verified: {
              verifyUrl: 'https://example.com',
              validation: 'VALID' as const,
              origin: 'https://example.com',
            },
          },
        },
      ];

      jest
        .spyOn(mockWeb3Wallet, 'getPendingSessionRequests')
        .mockReturnValue(mockPendingRequests);

      const respondSessionRequestSpy = jest
        .spyOn(mockWeb3Wallet, 'respondSessionRequest')
        .mockResolvedValue(undefined);

      respondSessionRequestSpy.mockClear();

      await manager.removePendings();

      expect(respondSessionRequestSpy).toHaveBeenCalledTimes(2);
      expect(respondSessionRequestSpy).toHaveBeenCalledWith({
        topic: 'topic1',
        response: {
          id: 1,
          jsonrpc: '2.0',
          error: { code: 1, message: ERROR_MESSAGES.INVALID_ID },
        },
      });
      expect(respondSessionRequestSpy).toHaveBeenCalledWith({
        topic: 'topic2',
        response: {
          id: 2,
          jsonrpc: '2.0',
          error: { code: 1, message: ERROR_MESSAGES.INVALID_ID },
        },
      });
    });

    it('logs error to console when removing pending session requests fails', async () => {
      const mockPendingRequests = [
        {
          id: 1,
          topic: 'topic1',
          params: {
            request: { method: 'eth_sendTransaction', params: [] },
            chainId: '0x1',
          },
          verifyContext: {
            verified: {
              verifyUrl: 'https://example.com',
              validation: 'VALID' as const,
              origin: 'https://example.com',
            },
          },
        },
      ];

      jest
        .spyOn(mockWeb3Wallet, 'getPendingSessionRequests')
        .mockReturnValue(mockPendingRequests);

      jest
        .spyOn(mockWeb3Wallet, 'respondSessionRequest')
        .mockRejectedValue(new Error('Test error'));

      await manager.removePendings();

      expect(consoleSpy).toHaveBeenCalledWith(
        "Can't remove request 1",
        expect.any(Error),
      );
    });

    it('does not process empty pending proposals and requests', async () => {
      jest
        .spyOn(mockWeb3Wallet, 'getPendingSessionProposals')
        .mockReturnValue({});
      jest
        .spyOn(mockWeb3Wallet, 'getPendingSessionRequests')
        .mockReturnValue([]);

      const rejectSessionSpy = jest.spyOn(mockWeb3Wallet, 'rejectSession');
      const respondSessionRequestSpy = jest.spyOn(
        mockWeb3Wallet,
        'respondSessionRequest',
      );

      rejectSessionSpy.mockClear();
      respondSessionRequestSpy.mockClear();

      await manager.removePendings();

      expect(rejectSessionSpy).not.toHaveBeenCalled();
      expect(respondSessionRequestSpy).not.toHaveBeenCalled();
    });
  });

  describe('WC2Manager session delete handling', () => {
    let mockWeb3Wallet: IWalletKit;
    let storageSetItemSpy: jest.SpyInstance;
    let sessionDeleteCallback: jest.Mock;

    beforeEach(() => {
      mockWeb3Wallet = (manager as unknown as { web3Wallet: IWalletKit })
        .web3Wallet;
      storageSetItemSpy = jest.spyOn(StorageWrapper, 'setItem');
      if (!sessionDeleteCallback) {
        sessionDeleteCallback = (
          mockWeb3Wallet.on as jest.Mock
        ).mock.calls.find(([event]) => event === 'session_delete')?.[1];
        expect(sessionDeleteCallback).toBeDefined();
      }
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('processes delete event for deeplink session', async () => {
      (mockWeb3Wallet.getActiveSessions as jest.Mock).mockReturnValue({
        'test-topic': {
          topic: 'test-topic',
          pairingTopic: 'test-pairing',
          peer: {
            metadata: {
              url: 'https://example.com',
              name: 'Test App',
              icons: [],
            },
          },
        },
      });

      (
        manager as unknown as { deeplinkSessions: Record<string, unknown> }
      ).deeplinkSessions['test-pairing'] = {
        redirectUrl: 'https://example.com',
        origin: 'deeplink',
      };

      // Trigger the session delete event
      await sessionDeleteCallback({ topic: 'test-topic' });

      // Verify that deeplinkSessions was updated and stored
      expect(
        (manager as unknown as { deeplinkSessions: Record<string, unknown> })
          .deeplinkSessions['test-pairing'],
      ).toBeUndefined();
      expect(storageSetItemSpy).toHaveBeenCalledWith(
        AppConstants.WALLET_CONNECT.DEEPLINK_SESSIONS,
        JSON.stringify({}),
      );
    });

    it('processes delete event for non-deeplink session', async () => {
      // Set up test data for a non-deeplink session
      (mockWeb3Wallet.getActiveSessions as jest.Mock).mockReturnValue({
        'test-topic': {
          topic: 'test-topic',
          pairingTopic: 'test-pairing',
          peer: {
            metadata: {
              url: 'https://example.com',
              name: 'Test App',
              icons: [],
            },
          },
        },
      });

      // Trigger the session delete event
      await sessionDeleteCallback({ topic: 'test-topic' });

      // Verify that storage was not called (since it's not a deeplink session)
      expect(storageSetItemSpy).not.toHaveBeenCalled();
    });

    it('processes delete event for non-existent session', async () => {
      (mockWeb3Wallet.getActiveSessions as jest.Mock).mockReturnValue({
        'test-topic': {
          topic: 'test-topic',
          pairingTopic: 'test-pairing',
          peer: {
            metadata: {
              url: 'https://example.com',
              name: 'Test App',
              icons: [],
            },
          },
        },
      });
      // Trigger the session delete event with a non-existent topic
      await sessionDeleteCallback({ topic: 'non-existent-topic' });

      // Verify that nothing was called since the session doesn't exist
      expect(storageSetItemSpy).not.toHaveBeenCalled();
    });

    it('deletes session on storage update error', async () => {
      (mockWeb3Wallet.getActiveSessions as jest.Mock).mockReturnValue({
        'test-topic': {
          topic: 'test-topic',
          pairingTopic: 'test-pairing',
          peer: {
            metadata: {
              url: 'https://example.com',
              name: 'Test App',
              icons: [],
            },
          },
        },
      });

      // Mock storage error
      storageSetItemSpy.mockRejectedValueOnce(new Error('Storage error'));

      // Trigger the session delete event
      await sessionDeleteCallback({ topic: 'test-topic' });
    });
  });

  describe('WC2Manager Navigation Integration', () => {
    beforeEach(() => {
      // Reset singleton state
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (WC2Manager as any).instance = undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (WC2Manager as any)._initialized = false;
      jest.clearAllMocks();
    });

    it('should access NavigationService.navigation during initialization', async () => {
      await WC2Manager.init({});
      // Verify that navigation was accessed (indirectly through successful initialization)
      expect((manager as any).navigation).toBeDefined();
    });

    it('should call getCurrentRoute during initialization', async () => {
      await WC2Manager.init({});
      expect(mockNavigation.getCurrentRoute).toHaveBeenCalled();
    });

    it('should skip initialization when navigation is not available', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Temporarily override the NavigationService mock to return undefined
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const NavigationService = require('../NavigationService').default;
      const originalGetter = Object.getOwnPropertyDescriptor(
        NavigationService,
        'navigation',
      )?.get;

      Object.defineProperty(NavigationService, 'navigation', {
        get: () => undefined,
        configurable: true,
      });

      // Reset singleton state
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (WC2Manager as any).instance = undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (WC2Manager as any)._initialized = false;

      const result = await WC2Manager.init({});

      expect(result).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'WC2::init missing navigation --- SKIP INIT',
      );

      // Restore original getter
      if (originalGetter) {
        Object.defineProperty(NavigationService, 'navigation', {
          get: originalGetter,
          configurable: true,
        });
      }

      consoleWarnSpy.mockRestore();
    });

    it('should call showWCLoadingState with navigation for existing sessionTopic connections', async () => {
      const mockWcUri = 'wc://test@2?sessionTopic=test-topic';
      const showLoadingSpy = jest.spyOn(wcUtils, 'showWCLoadingState');

      await manager.connect({
        wcUri: mockWcUri,
        redirectUrl: 'https://example.com',
        origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
      });

      expect(showLoadingSpy).toHaveBeenCalledWith({
        navigation: expect.any(Object),
      });
    });

    it('should call hideWCLoadingState with navigation during session proposal', async () => {
      const hideLoadingSpy = jest.spyOn(wcUtils, 'hideWCLoadingState');

      const mockSessionProposal = {
        id: 1,
        params: {
          id: 1,
          pairingTopic: 'test-pairing',
          proposer: {
            publicKey: 'test-public-key',
            metadata: {
              name: 'Test App',
              description: 'Test App',
              url: 'https://example.com',
              icons: ['https://example.com/icon.png'],
            },
          },
          expiryTimestamp: Date.now() + 300000,
          relays: [{ protocol: 'irn' }],
          requiredNamespaces: {
            eip155: {
              chains: ['eip155:1'],
              methods: ['eth_sendTransaction'],
              events: ['chainChanged', 'accountsChanged'],
            },
          },
          optionalNamespaces: {},
        },
        verifyContext: {
          verified: {
            verifyUrl: 'https://example.com',
            validation: 'VALID' as const,
            origin: 'https://example.com',
          },
        },
      };

      await manager.onSessionProposal(mockSessionProposal);

      expect(hideLoadingSpy).toHaveBeenCalledWith({
        navigation: expect.any(Object),
      });
    });

    it('should pass navigation to WalletConnect2Session instances', async () => {
      const WalletConnect2SessionSpy = jest.mocked(WalletConnect2Session);

      const mockSessionProposal = {
        id: 1,
        params: {
          id: 1,
          pairingTopic: 'test-pairing',
          proposer: {
            publicKey: 'test-public-key',
            metadata: {
              name: 'Test App',
              description: 'Test App',
              url: 'https://example.com',
              icons: ['https://example.com/icon.png'],
            },
          },
          expiryTimestamp: Date.now() + 300000,
          relays: [{ protocol: 'irn' }],
          requiredNamespaces: {
            eip155: {
              chains: ['eip155:1'],
              methods: ['eth_sendTransaction'],
              events: ['chainChanged', 'accountsChanged'],
            },
          },
          optionalNamespaces: {},
        },
        verifyContext: {
          verified: {
            verifyUrl: 'https://example.com',
            validation: 'VALID' as const,
            origin: 'https://example.com',
          },
        },
      };

      mockApproveSession.mockResolvedValue({
        topic: 'test-session-topic',
        pairingTopic: 'test-pairing',
        peer: {
          metadata: { url: 'https://example.com', name: 'Test App', icons: [] },
        },
      });

      await manager.onSessionProposal(mockSessionProposal);

      // Verify that WalletConnect2Session was created with navigation
      expect(WalletConnect2SessionSpy).toHaveBeenCalledWith({
        session: expect.any(Object),
        channelId: 'test-pairing',
        deeplink: false,
        web3Wallet: expect.any(Object),
        navigation: expect.any(Object),
      });
    });
  });

  describe('WC2Manager Loading State Navigation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should call showWCLoadingState with navigation when connecting', async () => {
      const showLoadingSpy = jest.spyOn(wcUtils, 'showWCLoadingState');
      const mockWcUri = 'wc://test@2?sessionTopic=test-topic';

      await manager.connect({
        wcUri: mockWcUri,
        redirectUrl: 'https://example.com',
        origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
      });

      expect(showLoadingSpy).toHaveBeenCalledWith({
        navigation: expect.any(Object),
      });
    });

    it('should call navigation methods in hideWCLoadingState when conditions are met', () => {
      // Import the actual implementation for this test
      const actualWcUtils = jest.requireActual('./wc-utils');

      // Mock navigation to return SDK_LOADING route
      mockNavigation.getCurrentRoute.mockReturnValue({
        name: Routes.SHEET.SDK_LOADING,
      });
      mockNavigation.canGoBack.mockReturnValue(true);

      // Call the actual implementation
      actualWcUtils.hideWCLoadingState({ navigation: mockNavigation });

      expect(mockNavigation.getCurrentRoute).toHaveBeenCalled();
      expect(mockNavigation.canGoBack).toHaveBeenCalled();
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  describe('WC2Manager initCore', () => {
    beforeEach(() => {
      // Clear all mocks before each test
      jest.clearAllMocks();
      // Spy on console.warn
      jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
      // Restore console.warn after each test
      jest.restoreAllMocks();
    });

    it('throws error when projectId is undefined', async () => {
      // eslint-disable-next-line dot-notation
      await expect(WC2Manager['initCore'](undefined)).rejects.toThrow(
        'WC2::init Init Missing projectId',
      );
    });

    it('throws error when projectId is empty string', async () => {
      // eslint-disable-next-line dot-notation
      await expect(WC2Manager['initCore']('')).rejects.toThrow(
        'WC2::init Init Missing projectId',
      );
    });

    it('throws error when Core initialization fails', async () => {
      // Override the mock for this specific test
      (Core as jest.MockedClass<typeof Core>).mockImplementationOnce(() => {
        throw new Error('Core initialization failed');
      });

      // eslint-disable-next-line dot-notation
      await expect(WC2Manager['initCore']('valid-project-id')).rejects.toThrow(
        'Core initialization failed',
      );

      // Verify that the error was logged
      expect(console.warn).toHaveBeenCalledWith(
        'WC2::init Init failed due to Error: Core initialization failed',
      );
    });

    it('successfully initializes Core with valid projectId', async () => {
      // eslint-disable-next-line dot-notation
      const result = await WC2Manager['initCore']('valid-project-id');

      expect(Core).toHaveBeenCalledWith({
        projectId: 'valid-project-id',
        logger: 'fatal',
      });
      expect(result).toBeDefined();
    });
  });
});

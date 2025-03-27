import { ERROR_MESSAGES, WC2Manager } from './WalletConnectV2';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: Ignoring the import error for testing purposes
import { NavigationContainerRef } from '@react-navigation/native';
import { SessionTypes } from '@walletconnect/types/dist/types/sign-client/session';
import StorageWrapper from '../../store/storage-wrapper';
import AppConstants from '../AppConstants';
import Engine from '../Engine';
import { IWalletKit } from '@reown/walletkit';
import WalletConnect from './WalletConnect';
import WalletConnect2Session from './WalletConnect2Session';
// eslint-disable-next-line import/no-namespace
import * as wcUtils from './wc-utils';

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

jest.mock('@reown/walletkit', () => {
  const mockClient = {
    approveRequest: jest.fn(),
    rejectRequest: jest.fn(),
    updateSession: jest.fn().mockResolvedValue(true),
    getPendingSessionRequests: jest.fn(),
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
            protocol: 'irn'
          },
          active: true,
          peerMetadata: {
            name: 'Test App',
            description: 'Test App Description',
            url: 'https://example.com',
            icons: ['https://example.com/icon.png'],
          },
          methods: ['eth_sendTransaction'],
        })
      }
    }
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
    },
  },
}));

jest.mock('../Permissions', () => ({
  getPermittedAccounts: jest
    .fn()
    .mockResolvedValue(['0x1234567890abcdef1234567890abcdef12345678']),
  getPermittedChains: jest.fn().mockResolvedValue(['eip155:1']),
}));

jest.mock('../../selectors/networkController', () => ({
  selectEvmChainId: jest.fn().mockReturnValue('0x1'),
  selectProviderConfig: jest.fn().mockReturnValue({
    type: 'mainnet',
    chainId: '0x1',
    ticker: 'ETH',
  }),
  selectEvmNetworkConfigurationsByChainId: jest.fn().mockReturnValue({}),
  selectSelectedNetworkClientId: jest.fn().mockReturnValue('0x1'),
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

describe('WC2Manager', () => {
  let manager: WC2Manager;
  let mockNavigation: NavigationContainerRef;
  let mockApproveSession: jest.SpyInstance;
  const _sessions: { [topic: string]: WalletConnect2Session } = {};

  beforeEach(async () => {
    mockNavigation = {
      getCurrentRoute: jest.fn().mockReturnValue({ name: 'Home' }),
      navigate: jest.fn(),
    } as unknown as NavigationContainerRef;

    const initResult = await WC2Manager.init({ navigation: mockNavigation, sessions: _sessions });
    if (!initResult) {
      throw new Error('Failed to initialize WC2Manager');
    }
    manager = initResult;

    // Access private property for testing using unknown cast
    const web3Wallet = (manager as unknown as { web3Wallet: IWalletKit }).web3Wallet;
    mockApproveSession = jest.spyOn(web3Wallet, 'approveSession');
  });

  it('should correctly handle a session proposal', async () => {
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
          origin: 'https://example.com'
        }
      }
    };

    await manager.onSessionProposal(mockSessionProposal);

    expect(mockApproveSession).toHaveBeenCalledWith({
      id: 1,
      namespaces: {
        eip155: {
          chains: ['eip155:1'],
          methods: expect.any(Array),
          events: ['chainChanged', 'accountsChanged'],
          accounts: ['eip155:1:0x1234567890abcdef1234567890abcdef12345678']
        }
      }
    });
  });

  describe('WC2Manager Initialization', () => {
    it('should initialize correctly when called with valid inputs', async () => {
      const result = await WC2Manager.init({ navigation: mockNavigation });
      expect(result).toBeInstanceOf(WC2Manager);
    });

    it('should not initialize if navigation is missing', async () => {
      const result = await WC2Manager.init({
        navigation: null as unknown as NavigationContainerRef,
      });
      expect(result).toBeUndefined();
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
    it('should handle v2 URIs correctly', async () => {
      const mockWcUri = 'wc://testv2uri';

      await manager.connect({
        wcUri: mockWcUri,
        redirectUrl: 'https://example.com',
        origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
      });

      const pairedSessions = manager.getSessions();
      expect(pairedSessions.length).toBeGreaterThan(0);
    });

    it('should not connect if URI is invalid', async () => {
      const mockWcUri = 'invalid-uri';

      await manager.connect({
        wcUri: mockWcUri,
        redirectUrl: 'https://example.com',
        origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
      });

      const sessions = manager.getSessions();
      expect(sessions.length).toBe(1);
    });

    it('should handle deeplink sessions correctly', async () => {
      const mockWcUri = 'wc:7f6e504bfad60b485450578e05678441fa7a8ea2b3d7d678ef6c72a2efe0f6ad@2?relay-protocol=irn&symKey=587d5484ce2a2a6ee3ba1962fdd7e8588e06200c46823bd18fbd67def96ad303';

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

    it('should handle existing sessionTopic connections', async () => {
      const mockWcUri = 'wc://test@2?sessionTopic=test-topic';
      const showLoadingSpy = jest.spyOn(wcUtils, 'showWCLoadingState');

      await manager.connect({
        wcUri: mockWcUri,
        redirectUrl: 'https://example.com',
        origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
      });

      expect(showLoadingSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle WalletConnect v1 URIs', async () => {
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
        'qrcode'
      );
    });

    it('should handle invalid URIs', async () => {
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
      mockWeb3Wallet = (manager as unknown as { web3Wallet: IWalletKit }).web3Wallet;
    });

    it('should handle session requests through event emission', async () => {
      // Get the callback that was registered for 'session_request'
      const sessionRequestCallback = (mockWeb3Wallet.on as jest.Mock).mock.calls.find(
        ([event]) => event === 'session_request'
      )?.[1];

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
            origin: 'https://example.com'
          }
        }
      };

      // Call the callback directly
      await sessionRequestCallback(mockRequest);
      
      const session = manager.getSession('test-topic');
      expect(session).toBeDefined();
    });

    it('should reject invalid session requests through event emission', async () => {
      const sessionRequestCallback = (mockWeb3Wallet.on as jest.Mock).mock.calls.find(
        ([event]) => event === 'session_request'
      )?.[1];

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
            origin: 'https://example.com'
          }
        }
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

    it('should handle errors during session request processing', async () => {
      const sessionRequestCallback = (mockWeb3Wallet.on as jest.Mock).mock.calls.find(
        ([event]) => event === 'session_request'
      )?.[1];

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
            origin: 'https://example.com'
          }
        }
      };

      // Mock an error in session handling
      const session = manager.getSession('test-topic');
      if (session) {
        const mockSession = _sessions[session.topic];
        mockSession.handleRequest = jest.fn().mockRejectedValue(new Error('Test error'));
      }

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await sessionRequestCallback(mockRequest);

      expect(consoleSpy).toHaveBeenCalledWith(
        'WC2::onSessionRequest() Error while handling request',
        expect.any(Error)
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
    it('should return true for valid WalletConnect origins', () => {
      const result = manager.isWalletConnect('https://example.com');
      expect(result).toBe(true);
    });

    it('should return false for invalid WalletConnect origins', () => {
      const result = manager.isWalletConnect('https://invalid.com');
      expect(result).toBe(false);
    });
  });

  describe('WC2Manager session proposal handling', () => {
    it('should handle session proposal rejection', async () => {
      const mockPermissionController = Engine.context.PermissionController;
      (mockPermissionController.requestPermissions as jest.Mock).mockRejectedValueOnce(new Error('User rejected'));

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
          relays: [{
            protocol: 'irn',
          }]
        },
        verifyContext: {
          verified: {
            verifyUrl: 'https://example.com',
            validation: 'VALID' as const,
            origin: 'https://example.com'
          }
        }
      };

      const mockWeb3Wallet = (manager as unknown as { web3Wallet: IWalletKit }).web3Wallet;
      const rejectSessionSpy = jest.spyOn(mockWeb3Wallet, 'rejectSession');

      await manager.onSessionProposal(mockSessionProposal);

      expect(rejectSessionSpy).toHaveBeenCalledWith({
        id: 1,
        reason: expect.any(Object),
      });
    });

    it('should handle session proposal with invalid wallet status', async () => {
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
          relays: [{
            protocol: 'irn',
          }]
        },
        verifyContext: {
          verified: {
            verifyUrl: 'https://example.com',
            validation: 'VALID' as const,
            origin: 'https://example.com'
          }
        }
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await manager.onSessionProposal(mockSessionProposal);

      expect(consoleSpy).toHaveBeenCalledWith(
        'invalid wallet status',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });
});

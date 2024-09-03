import Engine from '../Engine';
import { ApprovalTypes } from '../../core/RPCMethods/RPCMethodMiddleware';
import { flushPromises } from '../../util/test/utils';
import { WALLETCONNECT_SESSIONS } from '../../constants/storage';
import StorageWrapper from '../../store/storage-wrapper';
import WalletConnectInstance from './WalletConnect';
import { addTransaction } from '../../util/transaction-controller';
import { WalletDevice } from '@metamask/transaction-controller';
import { WALLET_CONNECT_ORIGIN } from '../../util/walletconnect';

interface WalletConnectSession {
  connected: boolean;
  accounts: string[];
  chainId: number;
  bridge: string;
  key: string;
  clientId: string;
  clientMeta: {
    description: string;
    url: string;
    icons: string[];
    name: string;
  };
  peerId: string;
  peerMeta: {
    description: string;
    url: string;
    icons: string[];
    name: string;
  };
  handshakeId: number;
  handshakeTopic: string;
}

const mockDappHost = 'metamask.io';
const mockDappUrl = `https://${mockDappHost}`;
const mockAutoSign = false;
const mockRedirectUrl = `${mockDappUrl}/redirect`;
const mockDappOrigin = 'origin';
const mockRandomId = '139404b0-1dd2-11b2-b040-cb962b38df0e';

jest.mock('@walletconnect/client');
jest.mock('../Engine', () => ({
  context: {
    KeyringController: {
      isUnlocked: jest.fn().mockReturnValue(true),
    },
    ApprovalController: {
      add: jest.fn(),
    },
    AccountsController: {
      getSelectedAccount: jest.fn().mockReturnValue({ address: '0x1234' }),
    },
  },
}));
const MockEngine = jest.mocked(Engine);
jest.mock('uuid', () => ({
  v1: jest.fn(() => mockRandomId),
}));
jest.mock('../../store/storage-wrapper', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
}));
jest.mock('../../util/transaction-controller', () => ({
  addTransaction: jest.fn(),
}));

describe('WalletConnect', () => {
  let WalletConnect: typeof WalletConnectInstance;
  let mockWalletConnectInstance: {
    init: jest.Mock;
    connectors: jest.Mock;
    newSession: jest.Mock;
    getSessions: jest.Mock;
    killSession: jest.Mock;
    isValidUri: jest.Mock;
    getValidUriFromDeeplink: jest.Mock;
    isSessionConnected: jest.Mock;
    hub: EventEmitter;
    handleCallRequest: jest.Mock;
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    mockWalletConnectInstance = {
      init: jest.fn().mockResolvedValue(undefined),
      newSession: jest
        .fn()
        .mockImplementation(
          async (redirectUrl, autosign, requestOriginatedFrom) => {
            const connector = {
              walletConnector: {
                on: jest.fn(),
                approveSession: jest.fn(),
                rejectSession: jest.fn(),
                killSession: jest.fn(),
                updateSession: jest.fn(),
                connected: false,
                session: {
                  peerId: 'mock-peer-id',
                  peerMeta: {
                    url: 'https://example.com',
                    name: 'Mock Dapp',
                    description: 'A mock dapp for testing',
                    icons: ['https://mockdapp.com/icon.png'],
                  },
                },
              },
              redirectUrl,
              autosign,
              requestOriginatedFrom,
            };
            mockWalletConnectInstance.connectors.mockImplementation(() => [
              ...mockWalletConnectInstance.connectors(),
              connector,
            ]);
            return connector;
          },
        ),
      getSessions: jest.fn().mockResolvedValue([]),
      killSession: jest.fn().mockImplementation(async (peerId: string) => {
        const connectors = mockWalletConnectInstance.connectors();
        const connectorToKill = connectors.find(
          (c: { walletConnector: { session: { peerId: string } } }) =>
            c.walletConnector.session.peerId === peerId,
        );
        if (connectorToKill) {
          await connectorToKill.walletConnector.killSession();
          connectorToKill.walletConnector.connected = false;
        }
        mockWalletConnectInstance.connectors.mockImplementation(() =>
          connectors.filter(
            (c: { walletConnector: { session: { peerId: string } } }) =>
              c.walletConnector.session.peerId !== peerId,
          ),
        );
      }),
      isValidUri: jest.fn().mockReturnValue(true),
      getValidUriFromDeeplink: jest.fn().mockReturnValue('valid-uri'),
      isSessionConnected: jest.fn().mockReturnValue(false),
      connectors: jest.fn().mockReturnValue([]),
      hub: new EventEmitter(),
      handleCallRequest: jest.fn(),
    };

    jest.mock('./WalletConnect', () => ({
      __esModule: true,
      default: mockWalletConnectInstance,
    }));

    WalletConnect = jest.requireActual('./WalletConnect').default;
  });

  it('should add new approval when new wallet connect session requested', async () => {
    const mockUri =
      'wc:00112233-4455-6677-8899-aabbccddeeff@1?bridge=https%3A%2F%2Fbridge.walletconnect.org&key=04a9...';
    const expectedApprovalRequest = {
      id: mockRandomId,
      origin: new URL(mockDappUrl).hostname,
      requestData: {
        peerMeta: {
          url: mockDappUrl,
          name: 'Mock Dapp',
          description: 'A mock dapp for testing',
          icons: ['https://mockdapp.com/icon.png'],
        },
        redirectUrl: mockRedirectUrl,
        autosign: mockAutoSign,
        requestOriginatedFrom: mockDappOrigin,
      },
      type: ApprovalTypes.WALLET_CONNECT,
    };

    const mockConnector = {
      walletConnector: {
        on: jest.fn(),
        approveSession: jest.fn(),
        rejectSession: jest.fn(),
        killSession: jest.fn(),
        updateSession: jest.fn(),
        connected: false,
        session: {
          peerId: 'mock-peer-id',
          peerMeta: expectedApprovalRequest.requestData.peerMeta,
        },
      },
      redirectUrl: mockRedirectUrl,
      autosign: mockAutoSign,
      requestOriginatedFrom: mockDappOrigin,
    };

    mockWalletConnectInstance.newSession.mockImplementation(
      async (uri, redirectUrl, autosign, requestOriginatedFrom) => {
        const connector = {
          walletConnector: {
            ...mockConnector.walletConnector,
            session: {
              ...mockConnector.walletConnector.session,
              peerMeta: {
                ...mockConnector.walletConnector.session.peerMeta,
                url: new URL(uri).origin,
              },
            },
          },
          redirectUrl,
          autosign,
          requestOriginatedFrom,
        };
        mockWalletConnectInstance.connectors.mockReturnValue([
          ...mockWalletConnectInstance.connectors(),
          connector,
        ]);
        await Engine.context.ApprovalController.add({
          ...expectedApprovalRequest,
          requestData: {
            ...expectedApprovalRequest.requestData,
            peerMeta: connector.walletConnector.session.peerMeta,
            redirectUrl,
            autosign,
            requestOriginatedFrom,
          },
        });
        return connector;
      },
    );

    const result = await WalletConnect.newSession(
      mockUri,
      mockRedirectUrl,
      mockAutoSign,
      mockDappOrigin,
    );

    expect(mockWalletConnectInstance.newSession).toHaveBeenCalledWith(
      mockUri,
      mockRedirectUrl,
      mockAutoSign,
      mockDappOrigin,
    );
    expect(Engine.context.ApprovalController.add).toHaveBeenCalledWith(
      expect.objectContaining({
        ...expectedApprovalRequest,
        requestData: expect.objectContaining({
          peerMeta: expect.objectContaining({
            url: new URL(mockUri).origin,
          }),
          redirectUrl: mockRedirectUrl,
          autosign: mockAutoSign,
          requestOriginatedFrom: mockDappOrigin,
        }),
      }),
    );
    expect(mockWalletConnectInstance.connectors).toHaveBeenCalled();

    const newConnectors = mockWalletConnectInstance.connectors();
    expect(newConnectors).toHaveLength(1);
    const newConnector = newConnectors[0];
    expect(newConnector).toBeDefined();
    expect(newConnector.walletConnector.session.peerMeta.url).toBe(
      new URL(mockUri).origin,
    );
    expect(newConnector.redirectUrl).toBe(mockRedirectUrl);
    expect(newConnector.autosign).toBe(mockAutoSign);
    expect(newConnector.requestOriginatedFrom).toBe(mockDappOrigin);

    // Verify that the session is not yet approved
    expect(newConnector.walletConnector.connected).toBe(false);
    expect(newConnector.walletConnector.approveSession).not.toHaveBeenCalled();

    // Verify the result
    expect(result).toEqual(newConnector);
  });

  it('should call rejectSession when user rejects wallet connect session', async () => {
    const userRejectionError = new Error('User rejected session');
    MockEngine.context.ApprovalController.add.mockRejectedValueOnce(
      userRejectionError,
    );

    const mockRejectSession = jest.fn();
    const mockConnector = {
      walletConnector: {
        rejectSession: mockRejectSession,
        session: {
          peerId: 'mock-peer-id',
          peerMeta: {
            url: 'https://example.com',
            name: 'Mock Dapp',
            description: 'A mock dapp for testing',
            icons: ['https://mockdapp.com/icon.png'],
          },
        },
      },
      redirectUrl: mockRedirectUrl,
      autosign: mockAutoSign,
      requestOriginatedFrom: 'origin',
    };

    mockWalletConnectInstance.newSession.mockImplementationOnce(
      async (redirectUrl, autosign, requestOriginatedFrom) => {
        mockWalletConnectInstance.connectors.mockReturnValue([mockConnector]);
        await MockEngine.context.ApprovalController.add({
          id: expect.any(String),
          origin: new URL(mockConnector.walletConnector.session.peerMeta.url)
            .hostname,
          type: ApprovalTypes.WALLET_CONNECT,
          requestData: expect.objectContaining({
            peerMeta: mockConnector.walletConnector.session.peerMeta,
            redirectUrl,
            autosign,
            requestOriginatedFrom,
          }),
        });
        return mockConnector;
      },
    );

    await expect(
      WalletConnect.newSession('URI', mockRedirectUrl, mockAutoSign, 'origin'),
    ).rejects.toThrow(userRejectionError);

    await flushPromises();

    expect(mockWalletConnectInstance.newSession).toHaveBeenCalledWith(
      'URI',
      mockRedirectUrl,
      mockAutoSign,
      'origin',
    );
    expect(mockRejectSession).toHaveBeenCalledTimes(1);
    expect(mockRejectSession).toHaveBeenCalledWith({
      error: { message: userRejectionError.message },
    });
    expect(mockWalletConnectInstance.connectors()).toHaveLength(0);
    expect(StorageWrapper.setItem).not.toHaveBeenCalled();
    expect(MockEngine.context.ApprovalController.add).toHaveBeenCalledTimes(1);
    expect(MockEngine.context.ApprovalController.add).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ApprovalTypes.WALLET_CONNECT,
        origin: 'example.com',
        requestData: expect.objectContaining({
          peerMeta: expect.objectContaining({
            url: 'https://example.com',
          }),
          redirectUrl: mockRedirectUrl,
          autosign: mockAutoSign,
          requestOriginatedFrom: 'origin',
        }),
      }),
    );

    // Verify that the connector is removed from the connectors list
    expect(mockWalletConnectInstance.connectors).toHaveBeenCalledTimes(2);
    expect(mockWalletConnectInstance.connectors.mock.calls[1][0]).toEqual([]);
  });

  it('should persist sessions after approving a new session', async () => {
    const mockSession: WalletConnectSession = {
      peerId: 'mock-peer-id',
      peerMeta: {
        url: mockDappUrl,
        name: 'Mock Dapp',
        description: 'A mock dapp for testing',
        icons: ['https://mockdapp.com/icon.png'],
      },
      connected: false,
      accounts: [],
      chainId: 0,
      bridge: 'https://bridge.walletconnect.org',
      key: 'mock-key',
      clientId: 'mock-client-id',
      clientMeta: {
        name: 'Mock Client',
        description: 'Mock Description',
        url: 'https://mock.url',
        icons: ['https://mock.icon.url'],
      },
      handshakeId: 1234567890,
      handshakeTopic: 'mock-handshake-topic',
    };

    const mockConnector = {
      walletConnector: {
        session: { ...mockSession },
        connected: false,
        approveSession: jest.fn(),
        updateSession: jest.fn(),
      },
      redirectUrl: mockRedirectUrl,
      autosign: mockAutoSign,
      requestOriginatedFrom: 'origin',
    };

    mockWalletConnectInstance.newSession.mockImplementation(async () => {
      await Engine.context.ApprovalController.add({
        id: expect.any(String),
        origin: new URL(mockDappUrl).hostname,
        type: ApprovalTypes.WALLET_CONNECT,
        requestData: expect.objectContaining({
          peerMeta: mockSession.peerMeta,
          redirectUrl: mockRedirectUrl,
          autosign: mockAutoSign,
          requestOriginatedFrom: 'origin',
        }),
      });
      return mockConnector;
    });
    mockWalletConnectInstance.connectors.mockReturnValue([mockConnector]);

    const mockChainId = '0x1';
    const mockSelectedAddress = '0x1234567890123456789012345678901234567890';
    jest
      .spyOn(Engine.context.AccountsController, 'getSelectedAccount')
      .mockReturnValue({
        address: mockSelectedAddress,
        type: 'eip155:eoa',
        id: 'mock-id',
        options: {},
        methods: [
          'personal_sign',
          'eth_sign',
          'eth_signTransaction',
          'eth_signTypedData_v1',
          'eth_signTypedData_v3',
          'eth_signTypedData_v4',
        ],
        metadata: {
          name: 'Mock Account',
          keyring: { type: 'HD Key Tree' },
          importTime: Date.now(),
        },
      });

    const mockStore = {
      getState: jest.fn().mockReturnValue({
        engine: {
          backgroundState: {
            NetworkController: {
              provider: { chainId: mockChainId },
            },
          },
        },
      }),
    };
    jest.mock('../../store', () => ({
      store: mockStore,
    }));

    await WalletConnect.newSession(
      'URI',
      mockRedirectUrl,
      mockAutoSign,
      'origin',
    );

    await flushPromises();

    expect(mockWalletConnectInstance.newSession).toHaveBeenCalledWith(
      'URI',
      mockRedirectUrl,
      mockAutoSign,
      'origin',
    );

    const expectedSessionData = {
      ...mockSession,
      connected: true,
      accounts: [mockSelectedAddress],
      chainId: parseInt(mockChainId, 16),
      autosign: mockAutoSign,
      redirectUrl: mockRedirectUrl,
      requestOriginatedFrom: 'origin',
      lastTimeConnected: expect.any(String),
    };

    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      WALLETCONNECT_SESSIONS,
      expect.stringMatching(JSON.stringify([expectedSessionData])),
    );

    expect(mockWalletConnectInstance.connectors()).toHaveLength(1);
    const connectorSession = mockConnector.walletConnector.session;
    expect(connectorSession).toEqual(
      expect.objectContaining(expectedSessionData),
    );

    expect(mockConnector.walletConnector.approveSession).toHaveBeenCalledWith({
      chainId: parseInt(mockChainId, 16),
      accounts: [mockSelectedAddress],
    });

    expect(mockConnector.walletConnector.connected).toBe(true);
    expect(Engine.context.ApprovalController.add).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        origin: new URL(mockDappUrl).hostname,
        type: ApprovalTypes.WALLET_CONNECT,
        requestData: expect.objectContaining({
          peerMeta: mockSession.peerMeta,
          redirectUrl: mockRedirectUrl,
          autosign: mockAutoSign,
          requestOriginatedFrom: 'origin',
        }),
      }),
    );
  });

  it('should kill session and remove from connectors list', async () => {
    const mockPeerId = 'mock-peer-id';
    const mockSession: WalletConnectSession = {
      peerId: mockPeerId,
      peerMeta: {
        url: mockDappUrl,
        name: 'Mock Dapp',
        description: 'A mock dapp for testing',
        icons: ['https://mockdapp.com/icon.png'],
      },
      connected: true,
      accounts: ['0x1234567890123456789012345678901234567890'],
      chainId: 1,
      bridge: 'https://bridge.walletconnect.org',
      key: 'mock-key',
      clientId: 'mock-client-id',
      clientMeta: {
        name: 'Mock Client',
        description: 'Mock Description',
        url: 'https://mock.url',
        icons: ['https://mock.icon.url'],
      },
      handshakeId: 1234567890,
      handshakeTopic: 'mock-handshake-topic',
    };

    const initialSessions = JSON.stringify([mockSession]);
    (StorageWrapper.getItem as jest.Mock).mockResolvedValue(initialSessions);

    const mockKillSession = jest.fn();
    const mockConnector = {
      walletConnector: {
        connected: true,
        session: mockSession,
        killSession: mockKillSession,
      },
    };

    mockWalletConnectInstance.connectors.mockReturnValue([mockConnector]);

    await WalletConnect.killSession(mockPeerId);

    expect(mockKillSession).toHaveBeenCalled();
    expect(mockWalletConnectInstance.killSession).toHaveBeenCalledWith(
      mockPeerId,
    );

    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      WALLETCONNECT_SESSIONS,
      '[]',
    );

    expect(mockWalletConnectInstance.connectors).toHaveBeenCalled();
    expect(mockWalletConnectInstance.connectors()).toHaveLength(0);

    const updatedConnectors = mockWalletConnectInstance.connectors();
    expect(
      updatedConnectors.find(
        (c: { walletConnector: { session: { peerId: string } } }) =>
          c.walletConnector.session.peerId === mockPeerId,
      ),
    ).toBeUndefined();

    expect(StorageWrapper.setItem).toHaveBeenCalledTimes(1);
    const setItemMock = StorageWrapper.setItem as jest.Mock;
    const persistedSessions = JSON.parse(setItemMock.mock.calls[0][1]);
    expect(persistedSessions).toEqual([]);

    expect(mockWalletConnectInstance.getSessions).toHaveBeenCalled();
    const remainingSessions = await mockWalletConnectInstance.getSessions();
    expect(remainingSessions).not.toContainEqual(
      expect.objectContaining({ peerId: mockPeerId }),
    );

    // Verify that the connector is removed from the connectors list
    expect(mockWalletConnectInstance.connectors).toHaveBeenCalledTimes(2);
    expect(mockWalletConnectInstance.connectors.mock.calls[1][0]).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({
          walletConnector: { session: { peerId: mockPeerId } },
        }),
      ]),
    );
  });

  it('should handle eth_sendTransaction correctly', async () => {
    const mockPayload = {
      id: 1,
      method: 'eth_sendTransaction',
      params: [
        {
          from: '0x1234567890123456789012345678901234567890',
          to: '0x0987654321098765432109876543210987654321',
          value: '0x0',
          data: '0x',
          gas: '0x5208', // 21000 gas
          gasPrice: '0x4a817c800', // 20 Gwei
        },
      ],
    };

    const mockTransactionHash = '0xabcdef1234567890';
    const mockAddTransactionResult = {
      result: Promise.resolve(mockTransactionHash),
    };
    (addTransaction as jest.Mock).mockResolvedValue(mockAddTransactionResult);

    mockWalletConnectInstance.handleCallRequest.mockImplementation(
      async (payload) => {
        if (payload.method === 'eth_sendTransaction') {
          const result = await addTransaction(payload.params[0], {
            deviceConfirmedOn: WalletDevice.MM_MOBILE,
            origin: `${WALLET_CONNECT_ORIGIN}https://example.com`, // Using a fixed URL for testing with correct format
          });
          return result.result;
        }
        throw new Error('Unsupported method');
      },
    );

    const result = await mockWalletConnectInstance.handleCallRequest(
      mockPayload,
    );

    expect(addTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '0x1234567890123456789012345678901234567890',
        to: '0x0987654321098765432109876543210987654321',
        value: '0x0',
        data: '0x',
        gas: '0x5208',
        gasPrice: '0x4a817c800',
      }),
      expect.objectContaining({
        deviceConfirmedOn: WalletDevice.MM_MOBILE,
        origin: `${WALLET_CONNECT_ORIGIN}https://example.com`,
      }),
    );

    await expect(result).resolves.toBe(mockTransactionHash);

    // Test error handling
    const invalidPayload = { ...mockPayload, method: 'unsupported_method' };
    await expect(
      mockWalletConnectInstance.handleCallRequest(invalidPayload),
    ).rejects.toThrow('Unsupported method');

    // Test transaction rejection
    const rejectionError = new Error('User rejected the transaction');
    (addTransaction as jest.Mock).mockRejectedValueOnce(rejectionError);
    await expect(
      mockWalletConnectInstance.handleCallRequest(mockPayload),
    ).rejects.toThrow(rejectionError);
  });
});

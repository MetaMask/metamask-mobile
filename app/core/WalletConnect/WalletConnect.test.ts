import Engine from '../Engine';
import { ApprovalTypes } from '../../core/RPCMethods/RPCMethodMiddleware';
import { flushPromises } from '../../util/test/utils';
import { WALLETCONNECT_SESSIONS } from '../../constants/storage';
import StorageWrapper from '../../store/storage-wrapper';
import WalletConnectInstance from './WalletConnect';

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
const mockSessionRequest = {
  params: [
    {
      peerMeta: {
        url: mockDappUrl,
      },
    },
  ],
};

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

describe('WalletConnect', () => {
  let WalletConnect: typeof WalletConnectInstance;
  let mockWalletConnectInstance: jest.Mocked<typeof WalletConnectInstance> & {
    walletConnector?: {
      on: jest.Mock;
      approveSession: jest.Mock;
      rejectSession: jest.Mock;
      killSession: jest.Mock;
      updateSession: jest.Mock;
      session: {
        peerId: string;
        peerMeta: { url: string };
      };
    };
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    const EventEmitter = require('events');

    mockWalletConnectInstance = {
      init: jest.fn().mockResolvedValue(undefined),
      newSession: jest.fn().mockResolvedValue(undefined),
      getSessions: jest.fn().mockResolvedValue([]),
      killSession: jest.fn().mockResolvedValue(undefined),
      isValidUri: jest.fn().mockReturnValue(true),
      getValidUriFromDeeplink: jest.fn().mockReturnValue('valid-uri'),
      isSessionConnected: jest.fn().mockReturnValue(false),
      connectors: jest.fn().mockReturnValue([]),
      hub: new EventEmitter(),
    };

    mockWalletConnectInstance.walletConnector = {
      on: jest.fn(),
      approveSession: jest.fn(),
      rejectSession: jest.fn(),
      killSession: jest.fn(),
      updateSession: jest.fn(),
      session: {
        peerId: 'mock-peer-id',
        peerMeta: { url: 'https://example.com' },
      },
    };

    jest.mock('./WalletConnect', () => ({
      __esModule: true,
      default: mockWalletConnectInstance,
    }));

    WalletConnect = require('./WalletConnect').default;
  });

  // Mock RNWalletConnect
  jest.mock('@walletconnect/client', () =>
    jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      approveSession: jest.fn(),
      rejectSession: jest.fn(),
      killSession: jest.fn(),
      updateSession: jest.fn(),
    })),
  );

  it('should add new approval when new wallet connect session requested', async () => {
    const expectedApprovalRequest = {
      id: mockRandomId,
      origin: mockDappHost,
      requestData: {
        autosign: mockAutoSign,
        peerMeta: {
          url: mockDappUrl,
        },
        redirectUrl: mockRedirectUrl,
        requestOriginatedFrom: mockDappOrigin,
      },
      type: ApprovalTypes.WALLET_CONNECT,
    };

    mockWalletConnectInstance.newSession.mockImplementation(
      async (uri, redirectUrl, autosign, origin) => {
        await Engine.context.ApprovalController.add(expectedApprovalRequest);
      },
    );

    await WalletConnect.newSession(
      'URI',
      mockRedirectUrl,
      mockAutoSign,
      mockDappOrigin,
    );

    expect(mockWalletConnectInstance.newSession).toHaveBeenCalledWith(
      'URI',
      mockRedirectUrl,
      mockAutoSign,
      mockDappOrigin,
    );
    expect(Engine.context.ApprovalController.add).toHaveBeenCalledWith(
      expectedApprovalRequest,
    );
  });

  it('should call rejectSession when user rejects wallet connect session', async () => {
    MockEngine.context.ApprovalController.add.mockRejectedValueOnce(
      new Error('Test error'),
    );

    const mockRejectSession = jest.fn();
    mockWalletConnectInstance.walletConnector = {
      on: jest.fn(),
      approveSession: jest.fn(),
      rejectSession: mockRejectSession,
      killSession: jest.fn(),
      updateSession: jest.fn(),
      session: {
        peerId: 'mock-peer-id',
        peerMeta: { url: 'https://example.com' },
      },
    };

    mockWalletConnectInstance.newSession.mockImplementation(async () => {
      await mockWalletConnectInstance.walletConnector?.rejectSession();
      throw new Error('Session request rejected');
    });

    await expect(
      WalletConnect.newSession('URI', mockRedirectUrl, mockAutoSign, 'origin'),
    ).rejects.toThrow('Session request rejected');

    await flushPromises();

    expect(mockRejectSession).toHaveBeenCalled();
    expect(
      mockWalletConnectInstance.walletConnector?.rejectSession,
    ).toHaveBeenCalled();
  });

  it('should persist sessions after approving a new session', async () => {
    const mockSession = {
      peerId: 'mock-peer-id',
      peerMeta: { url: mockDappUrl },
      handshakeTopic: 'mock-handshake-topic',
      key: 'mock-key',
    };

    mockWalletConnectInstance.newSession.mockImplementation(
      async (uri, redirectUrl, autosign, origin) => {
        const walletConnector = {
          session: mockSession,
          connected: true,
          updateSession: jest.fn(),
          approveSession: jest.fn(),
        };

        (mockWalletConnectInstance as any).walletConnector = walletConnector;

        // Simulate the behavior of startSession
        const chainId = 1; // Mock chain ID
        const selectedAddress = '0x1234'; // Mock selected address

        await walletConnector.approveSession({
          chainId,
          accounts: [selectedAddress],
        });

        // Simulate persisting sessions
        const sessionData = {
          ...mockSession,
          autosign,
          redirectUrl,
          requestOriginatedFrom: origin,
          lastTimeConnected: expect.any(String),
        };
        await StorageWrapper.setItem(
          WALLETCONNECT_SESSIONS,
          JSON.stringify([sessionData]),
        );
      },
    );

    await WalletConnect.newSession(
      'URI',
      mockRedirectUrl,
      mockAutoSign,
      'origin',
    );

    await flushPromises();

    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      WALLETCONNECT_SESSIONS,
      expect.stringMatching(
        new RegExp(
          JSON.stringify({
            peerId: 'mock-peer-id',
            peerMeta: { url: mockDappUrl },
            handshakeTopic: 'mock-handshake-topic',
            key: 'mock-key',
            autosign: mockAutoSign,
            redirectUrl: mockRedirectUrl,
            requestOriginatedFrom: 'origin',
            lastTimeConnected: expect.any(String),
          }).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        ),
      ),
    );

    expect(mockWalletConnectInstance.newSession).toHaveBeenCalledWith(
      'URI',
      mockRedirectUrl,
      mockAutoSign,
      'origin',
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

    mockWalletConnectInstance.getSessions.mockResolvedValue([mockSession]);
    mockWalletConnectInstance.killSession.mockImplementation(async (peerId) => {
      const sessions = await StorageWrapper.getItem(WALLETCONNECT_SESSIONS);
      const updatedSessions = JSON.parse(sessions).filter(
        (session: { peerId: string }) => session.peerId !== peerId,
      );
      await StorageWrapper.setItem(
        WALLETCONNECT_SESSIONS,
        JSON.stringify(updatedSessions),
      );
      // Call getSessions after killing the session
      await mockWalletConnectInstance.getSessions();
    });

    // Mock the initial state of sessions
    const initialSessions = JSON.stringify([mockSession]);
    (StorageWrapper.getItem as jest.Mock).mockResolvedValue(initialSessions);

    await WalletConnect.killSession(mockPeerId);

    expect(mockWalletConnectInstance.killSession).toHaveBeenCalledWith(
      mockPeerId,
    );

    // Verify that the session is removed from the persisted sessions
    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      WALLETCONNECT_SESSIONS,
      '[]',
    );

    // Verify that the session is removed from the connectors list
    expect(mockWalletConnectInstance.getSessions).toHaveBeenCalled();
  });
});

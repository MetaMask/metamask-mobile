import {
  AGENTIC_CLI_CONNECTION_LOADING_AUTODISMISS_MS,
  HostApplicationAdapter,
} from '../SDKConnectV2/adapters/host-application-adapter';
import { KeyManager } from '../SDKConnectV2/services/key-manager';
import { Connection } from '../SDKConnectV2/services/connection';
import { ConnectionInfo } from '../SDKConnectV2/types/connection-info';
import type { AgenticCliConnectionRequest } from './agenticCliConnectionRequest';
import {
  handleAgenticCliQrLogin,
  waitForKeyringUnlock,
} from './AgenticCliQrLoginService';
import {
  handleAgenticCliConnectDeeplink,
  isAgenticCliDeeplink,
} from './AgenticCliMwpConnectionService';
import {
  hideAgenticCliOtpCode,
  showAgenticCliOtpCode,
} from './agenticCliOtpUi';
import Engine from '../Engine';

jest.mock('../SDKConnectV2/adapters/host-application-adapter');
jest.mock('../SDKConnectV2/services/key-manager');
jest.mock('../SDKConnectV2/services/connection');
jest.mock('./agenticCliOtpUi', () => ({
  showAgenticCliOtpCode: jest.fn(),
  hideAgenticCliOtpCode: jest.fn(),
}));
jest.mock('./AgenticCliQrLoginService', () => {
  const actual = jest.requireActual('./AgenticCliQrLoginService');
  return {
    ...actual,
    waitForKeyringUnlock: jest.fn().mockResolvedValue(undefined),
    handleAgenticCliQrLogin: jest.fn().mockImplementation(async ({ conn }) => {
      await conn.client.sendResponse({
        type: 'auth-token',
        token: 'cli-token',
      });
    }),
  };
});
jest.mock('../../store', () => ({
  store: {
    dispatch: jest.fn(),
  },
}));
jest.mock('../../actions/notification', () => ({
  hideNotificationById: jest.fn((id) => ({
    type: 'HIDE_NOTIFICATION_BY_ID',
    id,
  })),
  showSimpleNotification: jest.fn(),
}));
jest.mock('../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    log: jest.fn(),
  },
}));
jest.mock('../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
  },
}));

const mockWaitForKeyringUnlock = jest.mocked(waitForKeyringUnlock);
const mockHandleAgenticCliQrLogin = jest.mocked(handleAgenticCliQrLogin);

describe('AgenticCliMwpConnectionService', () => {
  let mockHostApp: jest.Mocked<HostApplicationAdapter>;
  let mockKeyManager: jest.Mocked<KeyManager>;
  let mockConnection: jest.Mocked<Connection>;
  let mockConnectionRequest: AgenticCliConnectionRequest;
  let mockConnectionInfo: ConnectionInfo;
  let agenticCliDeeplink: string;

  const RELAY_URL = 'wss://test-relay.example.com';
  const clientHandlers: Record<string, (...args: unknown[]) => void> = {};

  beforeEach(() => {
    jest.clearAllMocks();
    for (const event of Object.keys(clientHandlers)) {
      delete clientHandlers[event];
    }

    mockConnectionRequest = {
      sessionRequest: {
        id: '11111111-2222-3333-4444-555555555555',
        publicKeyB64: 'AoBDLWxRbJNe8yUv5bmmoVnNo8DCilzbFz/nWD+RKC2V',
        channel: 'handshake:aabbccdd-1122-3344-5566-778899aabbcc',
        mode: 'trusted',
        expiresAt: Date.now() + 600_000,
      },
      metadata: {
        dapp: {
          name: 'Test DApp',
          url: 'https://test.dapp',
        },
        sdk: {
          version: '2.0.0',
          platform: 'JavaScript',
        },
      },
      connectionType: {
        name: 'agentic-cli',
      },
    };

    mockConnectionInfo = {
      id: mockConnectionRequest.sessionRequest.id,
      metadata: mockConnectionRequest.metadata,
      expiresAt: Date.now() + 600_000,
    };

    agenticCliDeeplink = `metamask://connect/mwp?p=${encodeURIComponent(
      JSON.stringify(mockConnectionRequest),
    )}`;

    Engine.context.KeyringController.isUnlocked = jest
      .fn()
      .mockReturnValue(true);

    mockHostApp =
      new HostApplicationAdapter() as jest.Mocked<HostApplicationAdapter>;
    mockKeyManager = new KeyManager() as jest.Mocked<KeyManager>;

    const sendResponse = jest.fn().mockResolvedValue(undefined);
    const off = jest.fn();
    const on = jest.fn(
      (event: string, handler: (...args: unknown[]) => void) => {
        clientHandlers[event] = handler;
      },
    );
    mockConnection = {
      id: mockConnectionRequest.sessionRequest.id,
      info: mockConnectionInfo,
      client: { sendResponse, on, off } as unknown as Connection['client'],
      connect: jest.fn().mockImplementation(async () => {
        clientHandlers.connected?.();
      }),
      disconnect: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Connection>;

    (Connection.create as jest.Mock).mockResolvedValue(mockConnection);
    mockWaitForKeyringUnlock.mockResolvedValue(undefined);
    mockHandleAgenticCliQrLogin.mockImplementation(async ({ conn }) => {
      await conn.client.sendResponse({
        type: 'auth-token',
        token: 'cli-token',
      });
    });
  });

  it('detects agentic CLI deeplinks', () => {
    expect(isAgenticCliDeeplink(agenticCliDeeplink)).toBe(true);
    expect(isAgenticCliDeeplink('metamask://connect/mwp?p=not-json')).toBe(
      false,
    );
  });

  it('does not re-parse when a pre-parsed connection request is provided', async () => {
    const parseMwpConnectDeeplinkModule = jest.requireActual<
      typeof import('../SDKConnectV2/utils/parseMwpConnectDeeplink')
    >('../SDKConnectV2/utils/parseMwpConnectDeeplink');
    const parseSpy = jest.spyOn(
      parseMwpConnectDeeplinkModule,
      'parseMwpConnectPayload',
    );

    await handleAgenticCliConnectDeeplink(
      agenticCliDeeplink,
      {
        relayURL: RELAY_URL,
        keymanager: mockKeyManager,
        hostapp: mockHostApp,
        getConnection: () => undefined,
        cleanupConnection: jest.fn().mockResolvedValue(undefined),
      },
      mockConnectionRequest,
    );

    expect(parseSpy).not.toHaveBeenCalled();
    parseSpy.mockRestore();
  });

  it('waits for keyring unlock before creating a connection', async () => {
    let resolveUnlock: () => void = jest.fn();
    mockWaitForKeyringUnlock.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveUnlock = resolve;
      }),
    );

    const promise = handleAgenticCliConnectDeeplink(agenticCliDeeplink, {
      relayURL: RELAY_URL,
      keymanager: mockKeyManager,
      hostapp: mockHostApp,
      getConnection: () => undefined,
      cleanupConnection: jest.fn().mockResolvedValue(undefined),
    });
    await Promise.resolve();

    expect(Connection.create).not.toHaveBeenCalled();
    expect(mockHostApp.showConnectionLoading).not.toHaveBeenCalled();

    resolveUnlock();
    await promise;

    expect(Connection.create).toHaveBeenCalledTimes(1);
    expect(mockConnection.connect).toHaveBeenCalledWith({
      ...mockConnectionRequest.sessionRequest,
      mode: 'untrusted',
    });
    expect(mockHandleAgenticCliQrLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        connReq: mockConnectionRequest,
        conn: mockConnection,
      }),
    );
    expect(mockHostApp.hideConnectionLoading).toHaveBeenCalledWith(
      expect.objectContaining({
        id: mockConnectionInfo.id,
      }),
    );
  });

  it('hides the OTP sheet when connect fails after display_otp', async () => {
    mockConnection.connect.mockImplementation(async () => {
      clientHandlers.display_otp?.('4892AKJ7', Date.now() + 60_000);
      throw new Error('MWP connect failed');
    });

    await handleAgenticCliConnectDeeplink(agenticCliDeeplink, {
      relayURL: RELAY_URL,
      keymanager: mockKeyManager,
      hostapp: mockHostApp,
      getConnection: () => undefined,
      cleanupConnection: jest.fn().mockResolvedValue(undefined),
    });

    expect(showAgenticCliOtpCode).toHaveBeenCalledWith(
      mockConnectionInfo,
      '4892AKJ7',
      expect.any(Number),
    );
    expect(hideAgenticCliOtpCode).toHaveBeenCalledWith(
      expect.objectContaining({ id: mockConnectionInfo.id }),
    );
    expect(mockHostApp.hideConnectionLoading).toHaveBeenCalledWith(
      expect.objectContaining({ id: mockConnectionInfo.id }),
    );
    expect(mockHostApp.showConnectionError).toHaveBeenCalled();
  });

  it('hides the OTP sheet when QR login fails after display_otp', async () => {
    mockConnection.connect.mockImplementation(async () => {
      clientHandlers.display_otp?.('4892AKJ7', Date.now() + 60_000);
      clientHandlers.connected?.();
    });
    mockHandleAgenticCliQrLogin.mockRejectedValueOnce(
      new Error('QR login failed'),
    );

    await handleAgenticCliConnectDeeplink(agenticCliDeeplink, {
      relayURL: RELAY_URL,
      keymanager: mockKeyManager,
      hostapp: mockHostApp,
      getConnection: () => undefined,
      cleanupConnection: jest.fn().mockResolvedValue(undefined),
    });

    expect(showAgenticCliOtpCode).toHaveBeenCalled();
    expect(hideAgenticCliOtpCode).toHaveBeenCalledWith(
      expect.objectContaining({ id: mockConnectionInfo.id }),
    );
    expect(mockHostApp.showConnectionError).toHaveBeenCalled();
  });

  it('waits for the MWP connected event before starting QR login', async () => {
    let completeConnect: (() => void) | undefined;
    mockConnection.connect.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          completeConnect = () => {
            clientHandlers.connected?.();
            resolve();
          };
        }),
    );

    const promise = handleAgenticCliConnectDeeplink(agenticCliDeeplink, {
      relayURL: RELAY_URL,
      keymanager: mockKeyManager,
      hostapp: mockHostApp,
      getConnection: () => undefined,
      cleanupConnection: jest.fn().mockResolvedValue(undefined),
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockHandleAgenticCliQrLogin).not.toHaveBeenCalled();

    completeConnect?.();
    await promise;

    expect(mockHandleAgenticCliQrLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        connReq: mockConnectionRequest,
        conn: mockConnection,
      }),
    );
  });

  it('reuses an established connection for login without reconnecting', async () => {
    await handleAgenticCliConnectDeeplink(agenticCliDeeplink, {
      relayURL: RELAY_URL,
      keymanager: mockKeyManager,
      hostapp: mockHostApp,
      getConnection: () => mockConnection,
      cleanupConnection: jest.fn().mockResolvedValue(undefined),
    });

    expect(Connection.create).not.toHaveBeenCalled();
    expect(mockConnection.connect).not.toHaveBeenCalled();
    expect(mockHandleAgenticCliQrLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        conn: mockConnection,
      }),
    );
  });

  it('skips dashboard login when operationType is not login', async () => {
    const nonLoginRequest: AgenticCliConnectionRequest = {
      ...mockConnectionRequest,
      connectionType: {
        name: 'agentic-cli',
        operationType: 'tx_approve',
      },
    };

    await handleAgenticCliConnectDeeplink(
      agenticCliDeeplink,
      {
        relayURL: RELAY_URL,
        keymanager: mockKeyManager,
        hostapp: mockHostApp,
        getConnection: () => undefined,
        cleanupConnection: jest.fn().mockResolvedValue(undefined),
      },
      nonLoginRequest,
    );

    expect(mockHandleAgenticCliQrLogin).not.toHaveBeenCalled();
  });

  it('hides the loading toast after a successful agentic QR handshake', async () => {
    const agenticQrRequest: AgenticCliConnectionRequest = {
      ...mockConnectionRequest,
      sessionRequest: {
        ...mockConnectionRequest.sessionRequest,
        initialMessage: undefined,
      },
    };
    const agenticQrDeeplink = `metamask://connect/mwp?p=${encodeURIComponent(
      JSON.stringify(agenticQrRequest),
    )}`;

    await handleAgenticCliConnectDeeplink(agenticQrDeeplink, {
      relayURL: RELAY_URL,
      keymanager: mockKeyManager,
      hostapp: mockHostApp,
      getConnection: () => undefined,
      cleanupConnection: jest.fn().mockResolvedValue(undefined),
    });

    expect(mockHostApp.showConnectionLoading).toHaveBeenCalledTimes(1);
    expect(mockHostApp.showConnectionLoading).toHaveBeenCalledWith(
      expect.objectContaining({ id: mockConnectionInfo.id }),
      { autodismissMs: AGENTIC_CLI_CONNECTION_LOADING_AUTODISMISS_MS },
    );
    expect(mockHostApp.hideConnectionLoading).toHaveBeenCalledTimes(1);
    expect(mockHandleAgenticCliQrLogin).toHaveBeenCalledTimes(1);
  });
});

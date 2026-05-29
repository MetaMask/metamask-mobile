import { showSimpleNotification } from '../../actions/notification';
import { store } from '../../store';
import Engine from '../Engine';
import { AgenticCliDashboardWebviewService } from '../../components/Views/AgenticCliDashboardWebview/AgenticCliDashboardWebviewService';
import { ConnectionRequest } from '../SDKConnectV2/types/connection-request';
import { Connection } from '../SDKConnectV2/services/connection';

const mockBuildTypeMapping = jest.fn(() => 'main_prod');

jest.mock('../OAuthService/OAuthLoginHandlers/constants', () => ({
  buildTypeMapping: (...args: unknown[]) => mockBuildTypeMapping(...args),
}));

jest.mock('../AppConstants', () => ({
  __esModule: true,
  default: {
    METAMASK_BUILD_TYPE: 'main',
    IS_DEV: false,
  },
}));

const AUTH_API_URL_BY_ENV: Record<string, string> = {
  prd: 'https://authentication.api.cx.metamask.io',
  dev: 'https://authentication.dev-api.cx.metamask.io',
  uat: 'https://authentication.uat-api.cx.metamask.io',
};

const mockGetEnvUrls = jest.fn((env: string) => ({
  authApiUrl: AUTH_API_URL_BY_ENV[env] ?? AUTH_API_URL_BY_ENV.prd,
}));

jest.mock('@metamask/profile-sync-controller', () => ({
  SDK: {
    getEnvUrls: (env: string) => mockGetEnvUrls(env),
  },
}));

jest.mock('../../store', () => ({
  store: {
    dispatch: jest.fn(),
  },
}));

jest.mock('../../actions/notification', () => ({
  showSimpleNotification: jest.fn((notification) => ({
    type: 'SHOW_SIMPLE_NOTIFICATION',
    notification,
  })),
}));

jest.mock('../../../locales/i18n', () => ({
  strings: jest.fn().mockImplementation((key) => key),
}));

jest.mock('../Engine', () => ({
  context: {
    KeyringController: {
      isUnlocked: jest.fn(() => true),
      state: {
        keyrings: [
          {
            type: 'HD Key Tree',
            metadata: { id: 'entropy-source-id' },
          },
        ],
      },
    },
    AuthenticationController: {
      getBearerToken: jest.fn().mockResolvedValue('hydra-token'),
    },
  },
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

jest.mock(
  '../../components/Views/AgenticCliDashboardWebview/AgenticCliDashboardWebviewService',
  () => ({
    AgenticCliDashboardWebviewService: {
      open: jest.fn().mockResolvedValue('cli-token'),
    },
  }),
);

const mockConnectionRequest = (
  connectionType: ConnectionRequest['connectionType'] = {
    name: 'agentic-cli',
  },
): ConnectionRequest => ({
  sessionRequest: {
    id: '11111111-2222-3333-4444-555555555555',
    publicKeyB64: 'AoBDLWxRbJNe8yUv5bmmoVnNo8DCilzbFz/nWD+RKC2V',
    channel: 'handshake:aabbccdd-1122-3344-5566-778899aabbcc',
    mode: 'trusted',
    expiresAt: Date.now() + 600_000,
  },
  metadata: {
    dapp: {
      name: 'Agentic CLI',
      url: 'https://agentic.metamask.io',
    },
    sdk: {
      version: '2.0.0',
      platform: 'CLI',
    },
  },
  connectionType,
});

const loadAgenticCliQrLoginService = () => {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./AgenticCliQrLoginService')
    .AgenticCliQrLoginService as typeof import('./AgenticCliQrLoginService').AgenticCliQrLoginService;
};

describe('AgenticCliQrLoginService', () => {
  const devGlobal = global as typeof globalThis & { __DEV__?: boolean };
  const originalDev = devGlobal.__DEV__;
  const originalFetch = global.fetch;

  const createMockConnection = (): jest.Mocked<Connection> =>
    ({
      id: '11111111-2222-3333-4444-555555555555',
      sendAuthToken: jest.fn().mockResolvedValue(undefined),
    }) as unknown as jest.Mocked<Connection>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildTypeMapping.mockReturnValue('main_prod');
    devGlobal.__DEV__ = false;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ access_token: 'dashboard-token' }),
    }) as jest.Mock;
  });

  afterEach(() => {
    devGlobal.__DEV__ = originalDev;
    global.fetch = originalFetch;
    jest.resetModules();
  });

  it('exchanges the Hydra token, opens prod dashboard, sends CLI token, and cleans up', async () => {
    mockBuildTypeMapping.mockReturnValue('main_prod');
    const AgenticCliQrLoginService = loadAgenticCliQrLoginService();
    const conn = createMockConnection();
    const cleanupConnection = jest.fn().mockResolvedValue(undefined);
    const setStage = jest.fn();

    await AgenticCliQrLoginService.handleConnection({
      connReq: mockConnectionRequest({
        name: 'agentic-cli',
        dashboardUrl: 'https://evil.example/agentic/login',
        dashboardAuthUrl: 'https://evil.example/token',
      }),
      conn,
      setStage,
      cleanupConnection,
    });

    expect(
      Engine.context.AuthenticationController.getBearerToken,
    ).toHaveBeenCalledWith('entropy-source-id');
    expect(mockGetEnvUrls).toHaveBeenCalledWith('prd');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://authentication.api.cx.metamask.io/api/v2/mm-qr-login/token',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer hydra-token',
        },
      }),
    );
    expect(AgenticCliDashboardWebviewService.open).toHaveBeenCalledWith({
      dashboardUrl: 'https://dashboard.w3a.io/agentic/login',
      dashboardToken: 'dashboard-token',
    });
    expect(conn.sendAuthToken).toHaveBeenCalledWith('cli-token');
    expect(showSimpleNotification).toHaveBeenCalledWith({
      id: '11111111-2222-3333-4444-555555555555-cli-link-success',
      autodismiss: 3000,
      title: 'sdk_connect_v2.show_cli_link_success.title',
      status: 'success',
      description: 'sdk_connect_v2.show_cli_link_success.description',
    });
    expect(store.dispatch).toHaveBeenCalledTimes(1);
    expect(cleanupConnection).toHaveBeenCalledWith(conn);
    expect(setStage).toHaveBeenCalledWith('send-auth-token-to-cli');
  });

  it('uses dev auth API and test dashboard for main_dev builds', async () => {
    mockBuildTypeMapping.mockReturnValue('main_dev');
    const AgenticCliQrLoginService = loadAgenticCliQrLoginService();
    const conn = createMockConnection();

    await AgenticCliQrLoginService.handleConnection({
      connReq: mockConnectionRequest({ name: 'agentic-cli' }),
      conn,
      setStage: jest.fn(),
      cleanupConnection: jest.fn().mockResolvedValue(undefined),
    });

    expect(mockGetEnvUrls).toHaveBeenCalledWith('dev');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://authentication.dev-api.cx.metamask.io/api/v2/mm-qr-login/token',
      expect.any(Object),
    );
    expect(AgenticCliDashboardWebviewService.open).toHaveBeenCalledWith({
      dashboardUrl: 'https://test-dashboard.web3auth.io/agentic/login',
      dashboardToken: 'dashboard-token',
    });
  });

  it('uses UAT auth API and UAT dashboard for main_uat builds', async () => {
    mockBuildTypeMapping.mockReturnValue('main_uat');
    const AgenticCliQrLoginService = loadAgenticCliQrLoginService();
    const conn = createMockConnection();

    await AgenticCliQrLoginService.handleConnection({
      connReq: mockConnectionRequest({ name: 'agentic-cli' }),
      conn,
      setStage: jest.fn(),
      cleanupConnection: jest.fn().mockResolvedValue(undefined),
    });

    expect(mockGetEnvUrls).toHaveBeenCalledWith('uat');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://authentication.uat-api.cx.metamask.io/api/v2/mm-qr-login/token',
      expect.any(Object),
    );
    expect(AgenticCliDashboardWebviewService.open).toHaveBeenCalledWith({
      dashboardUrl: 'https://uat-dashboard.web3auth.io/agentic/login',
      dashboardToken: 'dashboard-token',
    });
  });

  it('allows QR-provided local dashboard auth URLs in development builds', async () => {
    mockBuildTypeMapping.mockReturnValue('main_prod');
    const AgenticCliQrLoginService = loadAgenticCliQrLoginService();
    devGlobal.__DEV__ = true;
    const conn = createMockConnection();

    await AgenticCliQrLoginService.handleConnection({
      connReq: mockConnectionRequest({
        name: 'agentic-cli',
        dashboardAuthUrl: 'http://localhost:3000/api/v2/mm-qr-login/token',
      }),
      conn,
      setStage: jest.fn(),
      cleanupConnection: jest.fn().mockResolvedValue(undefined),
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v2/mm-qr-login/token',
      expect.any(Object),
    );
    expect(mockGetEnvUrls).not.toHaveBeenCalled();
  });

  it('waits for keyring unlock when locked', async () => {
    mockBuildTypeMapping.mockReturnValue('main_prod');
    const AgenticCliQrLoginService = loadAgenticCliQrLoginService();
    (
      Engine.context.KeyringController.isUnlocked as jest.Mock
    ).mockReturnValueOnce(false);

    const waitPromise = AgenticCliQrLoginService.waitForKeyringUnlock();
    const unlockHandler = (Engine.controllerMessenger.subscribe as jest.Mock)
      .mock.calls[0][1];
    unlockHandler();

    await waitPromise;

    expect(Engine.controllerMessenger.unsubscribe).toHaveBeenCalledWith(
      'KeyringController:unlock',
      unlockHandler,
    );
  });
});

import { showSimpleNotification } from '../../actions/notification';
import { store } from '../../store';
import { AgenticCliDashboardWebviewService } from '../../components/Views/AgenticCliDashboardWebview/AgenticCliDashboardWebviewService';
import { Connection } from '../SDKConnectV2/services/connection';
import type { AgenticCliConnectionRequest } from './agenticCliConnectionRequest';

const mockGetBuildType = jest.fn(() => 'main_prod');

jest.mock('../OAuthService/OAuthLoginHandlers/constants', () => ({
  getBuildType: jest.fn(() => mockGetBuildType()),
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

const mockMaybePromptPushPermissionAfterCliLogin = jest.fn();
jest.mock('./promptPushNotificationPermission', () => ({
  maybePromptPushPermissionAfterCliLogin: () =>
    mockMaybePromptPushPermissionAfterCliLogin(),
}));

const mockGetBearerToken = jest.fn().mockResolvedValue('hydra-token');
const mockIsUnlocked = jest.fn(() => true);
const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock('../Engine', () => ({
  __esModule: true,
  default: {
    context: {
      KeyringController: {
        isUnlocked: mockIsUnlocked,
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
        getBearerToken: mockGetBearerToken,
      },
    },
    controllerMessenger: {
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
    },
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
  connectionType: AgenticCliConnectionRequest['connectionType'] = {
    name: 'agentic-cli',
  },
): AgenticCliConnectionRequest => ({
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

const loadAgenticCliQrLogin = (
  buildType: string,
): typeof import('./AgenticCliQrLoginService') => {
  mockGetBuildType.mockReturnValue(buildType);
  let qrLoginModule: typeof import('./AgenticCliQrLoginService') | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    qrLoginModule = require('./AgenticCliQrLoginService');
  });
  if (!qrLoginModule) {
    throw new Error('AgenticCliQrLoginService module not found');
  }
  return qrLoginModule;
};

describe('AgenticCliQrLoginService', () => {
  const originalFetch = global.fetch;
  const originalMmDevApiEnv = process.env.MM_DEV_API_ENV;

  const createMockConnection = (): jest.Mocked<Connection> =>
    ({
      id: '11111111-2222-3333-4444-555555555555',
      client: {
        sendResponse: jest.fn().mockResolvedValue(undefined),
      },
    }) as unknown as jest.Mocked<Connection>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MM_DEV_API_ENV = 'dev';
    mockGetBearerToken.mockResolvedValue('hydra-token');
    mockIsUnlocked.mockReturnValue(true);
    (AgenticCliDashboardWebviewService.open as jest.Mock).mockResolvedValue(
      'cli-token',
    );
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ access_token: 'dashboard-token' }),
    }) as jest.Mock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalMmDevApiEnv === undefined) {
      delete process.env.MM_DEV_API_ENV;
    } else {
      process.env.MM_DEV_API_ENV = originalMmDevApiEnv;
    }
  });

  it('ignores QR-provided dashboard and auth URLs', async () => {
    const { handleAgenticCliQrLogin } = loadAgenticCliQrLogin('main_prod');
    const conn = createMockConnection();

    await handleAgenticCliQrLogin({
      connReq: mockConnectionRequest({
        name: 'agentic-cli',
        dashboardUrl: 'https://evil.example/agentic/login',
        dashboardAuthUrl: 'http://localhost:3000/api/v2/mm-qr-login/token',
      }),
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
      dashboardUrl: 'https://developer.metamask.io/agentic/login',
      dashboardToken: 'dashboard-token',
    });
  });

  it('exchanges the Hydra token, opens prod dashboard, sends CLI token, and cleans up', async () => {
    const { handleAgenticCliQrLogin } = loadAgenticCliQrLogin('main_prod');
    const conn = createMockConnection();
    const cleanupConnection = jest.fn().mockResolvedValue(undefined);
    const setStage = jest.fn();

    await handleAgenticCliQrLogin({
      connReq: mockConnectionRequest({ name: 'agentic-cli' }),
      conn,
      setStage,
      cleanupConnection,
    });

    expect(mockGetBearerToken).toHaveBeenCalledWith('entropy-source-id');
    expect(mockGetEnvUrls).toHaveBeenCalledWith('dev');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://authentication.dev-api.cx.metamask.io/api/v2/mm-qr-login/token',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer hydra-token',
        },
      }),
    );
    expect(AgenticCliDashboardWebviewService.open).toHaveBeenCalledWith({
      dashboardUrl: 'https://developer.metamask.io/agentic/login',
      dashboardToken: 'dashboard-token',
    });
    expect(conn.client.sendResponse).toHaveBeenCalledWith({
      type: 'auth-token',
      token: 'cli-token',
    });
    expect(showSimpleNotification).toHaveBeenCalledWith({
      id: '11111111-2222-3333-4444-555555555555-cli-link-success',
      autodismiss: 3000,
      title: 'sdk_connect_v2.show_cli_link_success.title',
      status: 'success',
      description: 'sdk_connect_v2.show_cli_link_success.description',
    });
    expect(store.dispatch).toHaveBeenCalledTimes(1);
    expect(mockMaybePromptPushPermissionAfterCliLogin).toHaveBeenCalledTimes(1);
    expect(cleanupConnection).toHaveBeenCalledWith(conn);
    expect(setStage).toHaveBeenCalledWith('send-auth-token-to-cli');
  });

  it('uses dev auth API and develop dashboard for main_dev builds', async () => {
    const { handleAgenticCliQrLogin } = loadAgenticCliQrLogin('main_dev');
    const conn = createMockConnection();

    await handleAgenticCliQrLogin({
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
      dashboardUrl: 'https://develop-developer.metamask.io/agentic/login',
      dashboardToken: 'dashboard-token',
    });
  });

  it('uses dev auth API and staging dashboard for main_uat builds', async () => {
    const { handleAgenticCliQrLogin } = loadAgenticCliQrLogin('main_uat');
    const conn = createMockConnection();

    await handleAgenticCliQrLogin({
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
      dashboardUrl: 'https://staging-developer.metamask.io/agentic/login',
      dashboardToken: 'dashboard-token',
    });
  });

  it('uses prod auth API when MM_DEV_API_ENV is prod', async () => {
    process.env.MM_DEV_API_ENV = 'prod';
    const { handleAgenticCliQrLogin } = loadAgenticCliQrLogin('main_prod');
    const conn = createMockConnection();

    await handleAgenticCliQrLogin({
      connReq: mockConnectionRequest({ name: 'agentic-cli' }),
      conn,
      setStage: jest.fn(),
      cleanupConnection: jest.fn().mockResolvedValue(undefined),
    });

    expect(mockGetEnvUrls).toHaveBeenCalledWith('prd');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://authentication.api.cx.metamask.io/api/v2/mm-qr-login/token',
      expect.any(Object),
    );
    expect(AgenticCliDashboardWebviewService.open).toHaveBeenCalledWith({
      dashboardUrl: 'https://developer.metamask.io/agentic/login',
      dashboardToken: 'dashboard-token',
    });
  });

  it('waits for keyring unlock when locked', async () => {
    const { waitForKeyringUnlock } = loadAgenticCliQrLogin('main_prod');
    mockIsUnlocked.mockReturnValueOnce(false);

    const waitPromise = waitForKeyringUnlock();
    const unlockHandler = mockSubscribe.mock.calls[0][1];
    unlockHandler();

    await waitPromise;

    expect(mockUnsubscribe).toHaveBeenCalledWith(
      'KeyringController:unlock',
      unlockHandler,
    );
  });

  it('resolves when unlock happens between isUnlocked check and subscribe', async () => {
    const { waitForKeyringUnlock } = loadAgenticCliQrLogin('main_prod');
    mockIsUnlocked.mockReturnValueOnce(false).mockReturnValue(true);

    await waitForKeyringUnlock();

    expect(mockSubscribe).toHaveBeenCalledWith(
      'KeyringController:unlock',
      expect.any(Function),
    );
    expect(mockUnsubscribe).toHaveBeenCalledWith(
      'KeyringController:unlock',
      mockSubscribe.mock.calls[0][1],
    );
  });
});

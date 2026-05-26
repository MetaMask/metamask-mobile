import { SDK } from '@metamask/profile-sync-controller';
import { KeyringTypes } from '@metamask/keyring-controller';
import Engine from '../../../core/Engine';
import { authEnv } from '../../../core/devApiEnv';
import { MfaWebviewAuthService } from './MfaWebviewAuthService';

jest.mock('@metamask/profile-sync-controller', () => ({
  SDK: {
    getEnvUrls: jest.fn(),
  },
}));

jest.mock('../../../core/devApiEnv', () => ({
  authEnv: jest.fn(),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    AuthenticationController: {
      getBearerToken: jest.fn(),
    },
    KeyringController: {
      state: {
        keyrings: [],
      },
    },
  },
}));

const mockGetEnvUrls = SDK.getEnvUrls as jest.MockedFunction<
  typeof SDK.getEnvUrls
>;
const mockAuthEnv = authEnv as jest.MockedFunction<typeof authEnv>;
const mockGetBearerToken = Engine.context.AuthenticationController
  .getBearerToken as jest.MockedFunction<
  typeof Engine.context.AuthenticationController.getBearerToken
>;

describe('MfaWebviewAuthService', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetAllMocks();
    mockAuthEnv.mockReturnValue('dev' as ReturnType<typeof authEnv>);
    mockGetEnvUrls.mockReturnValue({
      authApiUrl: 'https://authentication.dev-api.cx.metamask.io',
    } as ReturnType<typeof SDK.getEnvUrls>);
    Engine.context.KeyringController.state.keyrings = [
      {
        type: KeyringTypes.hd,
        accounts: [],
        metadata: { id: 'entropy-source-1', name: 'Secret Recovery Phrase 1' },
      },
    ];
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('builds the MM Auth QR login token endpoint from the current auth env', () => {
    expect(MfaWebviewAuthService.getCliDashboardTokenUrl()).toBe(
      'https://authentication.dev-api.cx.metamask.io/api/v2/mm-qr-login/token',
    );
  });

  it('exchanges the SRP Hydra token for the dashboard auth token', async () => {
    mockGetBearerToken.mockResolvedValue('hydra-token');
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ access_token: 'dashboard-token' }),
    });

    await expect(MfaWebviewAuthService.getAuthToken()).resolves.toBe(
      'dashboard-token',
    );

    expect(mockGetBearerToken).toHaveBeenCalledWith('entropy-source-1');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://authentication.dev-api.cx.metamask.io/api/v2/mm-qr-login/token',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer hydra-token' },
        body: '',
      },
    );
  });

  it('falls back to the first keyring when no HD keyring exists', async () => {
    Engine.context.KeyringController.state.keyrings = [
      {
        type: 'Simple Key Pair',
        accounts: [],
        metadata: { id: 'fallback-keyring', name: 'Fallback keyring' },
      },
    ];
    mockGetBearerToken.mockResolvedValue('hydra-token');
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ access_token: 'dashboard-token' }),
    });

    await MfaWebviewAuthService.getAuthToken();

    expect(mockGetBearerToken).toHaveBeenCalledWith('fallback-keyring');
  });

  it('includes the server response body when the exchange fails', async () => {
    mockGetBearerToken.mockResolvedValue('hydra-token');
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: jest.fn().mockResolvedValue('invalid token'),
    });

    await expect(MfaWebviewAuthService.getAuthToken()).rejects.toThrow(
      'Failed to get CLI dashboard token: 401 invalid token',
    );
  });

  it('rejects an exchange response without access_token', async () => {
    mockGetBearerToken.mockResolvedValue('hydra-token');
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    });

    await expect(MfaWebviewAuthService.getAuthToken()).rejects.toThrow(
      'Failed to get CLI dashboard token: missing access_token',
    );
  });
});

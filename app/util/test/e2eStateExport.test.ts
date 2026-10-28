jest.mock('axios');
jest.mock('../../store', () => ({
  store: {
    getState: jest.fn(),
  },
}));
jest.mock('./utils', () => ({
  getCommandQueueServerPortInApp: () => 2446,
}));

import axios from 'axios';
import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
} from '@metamask/messenger';
import {
  Controller as AuthenticationController,
  type AuthenticationControllerMessenger,
} from '@metamask/profile-sync-controller/auth';
import { Platform } from '@metamask/profile-sync-controller/sdk';
import Engine from '../../core/Engine';
import { store } from '../../store';
import { generateStateLogs } from '../logs';
import {
  captureAppState,
  captureExportedAppState,
  handleExportAppStateCommand,
  handleExportStateCommand,
} from './e2eStateExport';

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedGetState = store.getState as jest.Mock;

const EXPORTED_SECRETS = {
  jwt: 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJlMmUtZml4dHVyZSJ9.e2e-signature',
  bearerToken: 'e2e-bearer-token',
  refreshToken: 'e2e-refresh-token',
  accessToken: 'e2e-access-token',
  vault: 'e2e-vault-cipher',
  encryptionKey: 'e2e-encryption-key',
  encryptionSalt: 'e2e-encryption-salt',
  mnemonic:
    'e2e abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  privateKey: 'e2e-private-key',
  otp: 'e2e-otp-secret',
} as const;

function stateWithSecrets() {
  return {
    settings: {
      theme: 'dark',
      displayName: EXPORTED_SECRETS.jwt,
    },
    engine: {
      backgroundState: {
        AuthenticationController: {
          isSignedIn: true,
          needsProfilePairing: false,
          needsSocialPairing: false,
          bearerToken: EXPORTED_SECRETS.bearerToken,
          srpSessionData: {
            'entropy-source-id': {
              token: {
                accessToken: EXPORTED_SECRETS.accessToken,
                expiresIn: 3600,
                obtainedAt: 1700000000000,
              },
              profile: {
                identifierId: 'identifier-id',
                profileId: 'profile-id',
                canonicalProfileId: 'canonical-profile-id',
                metaMetricsId: 'profile-metametrics-id',
                pairedIdentifierIds: [
                  { id: 'paired-identifier-id', type: 'SRP' },
                ],
              },
            },
          },
          enrolledCredentials: [
            {
              type: 'email_otp',
              status: 'active',
              enrolledAt: 1700000000000,
              email: 'user@example.com',
              verified: true,
            },
          ],
        },
        KeyringController: {
          vault: EXPORTED_SECRETS.vault,
          encryptionKey: EXPORTED_SECRETS.encryptionKey,
          encryptionSalt: EXPORTED_SECRETS.encryptionSalt,
          keyrings: [
            {
              type: 'HD Key Tree',
              mnemonic: EXPORTED_SECRETS.mnemonic,
              accounts: ['0xabc'],
            },
          ],
        },
        SeedlessOnboardingController: {
          refreshToken: EXPORTED_SECRETS.refreshToken,
          socialLogin: { idToken: EXPORTED_SECRETS.jwt },
        },
        QrSyncController: {
          otp: EXPORTED_SECRETS.otp,
          pendingSecretImports: [{ privateKey: EXPORTED_SECRETS.privateKey }],
        },
        TokensController: {
          allTokens: {
            '0x1': {
              '0xabc': [{ symbol: 'ETH', address: '0xabc' }],
            },
          },
        },
        NetworkController: { selectedNetworkClientId: 'mainnet' },
      },
    },
  };
}

const SANITIZED_AUTHENTICATION_STATE = {
  isSignedIn: true,
  needsProfilePairing: false,
  needsSocialPairing: false,
  srpSessionData: {
    'entropy-source-id': {
      token: { expiresIn: 3600, obtainedAt: 1700000000000 },
      profile: {
        identifierId: 'identifier-id',
        profileId: 'profile-id',
        canonicalProfileId: 'canonical-profile-id',
        metaMetricsId: 'profile-metametrics-id',
      },
    },
  },
  enrolledCredentials: [
    { type: 'email_otp', status: 'active', enrolledAt: 1700000000000 },
  ],
} as const;

function installAuthenticationController() {
  const rootMessenger = new Messenger<
    MockAnyNamespace,
    MessengerActions<AuthenticationControllerMessenger>,
    MessengerEvents<AuthenticationControllerMessenger>
  >({ namespace: MOCK_ANY_NAMESPACE });
  rootMessenger.registerActionHandler('KeyringController:getState', () => ({
    isUnlocked: false,
    keyrings: [],
  }));
  const messenger: AuthenticationControllerMessenger = new Messenger({
    namespace: 'AuthenticationController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['KeyringController:getState'],
    events: ['KeyringController:lock', 'KeyringController:unlock'],
    messenger,
  });
  Engine.context.AuthenticationController = new AuthenticationController({
    messenger,
    metametrics: {
      agent: Platform.MOBILE,
      getMetaMetricsId: () => 'metametrics-id',
    },
  });
}

function removeAuthenticationController() {
  Reflect.deleteProperty(Engine.context, 'AuthenticationController');
}

function expectSerializedWithoutSecrets(value: unknown) {
  const serialized = JSON.stringify(value);

  for (const secret of Object.values(EXPORTED_SECRETS)) {
    expect(serialized).not.toContain(secret);
  }
}

describe('e2eStateExport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('captureAppState', () => {
    it('splits state into redux and engine', () => {
      mockedGetState.mockReturnValue({
        settings: { theme: 'dark' },
        engine: {
          backgroundState: {
            NetworkController: { selectedNetworkClientId: 'mainnet' },
          },
        },
      });

      const result = captureAppState();

      expect(result.redux).toEqual({ settings: { theme: 'dark' } });
      expect(result.engine).toEqual({
        NetworkController: { selectedNetworkClientId: 'mainnet' },
      });
    });

    it('returns empty engine when backgroundState is missing', () => {
      mockedGetState.mockReturnValue({
        settings: { theme: 'light' },
        engine: {},
      });

      const result = captureAppState();

      expect(result.redux).toEqual({ settings: { theme: 'light' } });
      expect(result.engine).toEqual({});
    });

    it('strips non-serializable values via JSON round-trip', () => {
      mockedGetState.mockReturnValue({
        settings: { callback: undefined, name: 'test' },
        engine: { backgroundState: {} },
      });

      const result = captureAppState();

      // undefined values are stripped by JSON.stringify
      expect(result.redux).toEqual({ settings: { name: 'test' } });
    });

    it('omits an opaque node auth token from the raw export', () => {
      mockedGetState.mockReturnValue({
        settings: {},
        engine: {
          backgroundState: {
            SeedlessOnboardingController: {
              nodeAuthTokens: [
                {
                  nodeIndex: 1,
                  nodePubKey: 'e2e-node-pub-key',
                  authToken: 'opaque-secret',
                },
              ],
            },
          },
        },
      });

      const result = captureAppState();

      expect(result.engine).toEqual({
        SeedlessOnboardingController: {
          nodeAuthTokens: [
            {
              nodeIndex: 1,
              nodePubKey: 'e2e-node-pub-key',
              authToken: null,
            },
          ],
        },
      });
      expect(JSON.stringify(result)).not.toContain('opaque-secret');
    });

    it('omits authentication tokens and wallet secrets from exported state', () => {
      mockedGetState.mockReturnValue(stateWithSecrets());

      const result = captureAppState();

      expect(result).toMatchObject({
        redux: { settings: { theme: 'dark' } },
        engine: {
          NetworkController: { selectedNetworkClientId: 'mainnet' },
          TokensController: {
            allTokens: {
              '0x1': {
                '0xabc': [{ symbol: 'ETH', address: '0xabc' }],
              },
            },
          },
        },
      });
      expectSerializedWithoutSecrets(result);
    });
  });

  describe('handleExportStateCommand', () => {
    it('POSTs captured state to the command queue server', async () => {
      mockedGetState.mockReturnValue({
        settings: { theme: 'dark' },
        engine: { backgroundState: { NetworkController: {} } },
      });
      mockedAxios.post.mockResolvedValueOnce({ status: 200 });

      await handleExportStateCommand();

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:2446/exported-state',
        {
          redux: { settings: { theme: 'dark' } },
          engine: { NetworkController: {} },
        },
      );
    });

    it('propagates errors to the caller for logging', async () => {
      mockedGetState.mockReturnValue({
        settings: {},
        engine: { backgroundState: {} },
      });
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(handleExportStateCommand()).rejects.toThrow('Network error');
    });

    it('posts exported state without authentication tokens or wallet secrets', async () => {
      mockedGetState.mockReturnValue(stateWithSecrets());
      mockedAxios.post.mockResolvedValueOnce({ status: 200 });

      await handleExportStateCommand();

      expectSerializedWithoutSecrets(mockedAxios.post.mock.calls[0]?.[1]);
    });
  });

  describe('captureExportedAppState', () => {
    const originalSeedless = (
      Engine.context as { SeedlessOnboardingController?: unknown }
    ).SeedlessOnboardingController;

    beforeEach(() => {
      installAuthenticationController();
      (
        Engine.context as {
          SeedlessOnboardingController: { state: Record<string, unknown> };
        }
      ).SeedlessOnboardingController = {
        state: {
          accessToken: EXPORTED_SECRETS.accessToken,
          refreshToken: EXPORTED_SECRETS.refreshToken,
          vault: EXPORTED_SECRETS.vault,
          socialBackupsMetadata: [],
          nodeAuthTokens: [
            {
              nodeIndex: 0,
              nodePubKey: 'e2e-node-pub-key',
              token: EXPORTED_SECRETS.jwt,
            },
          ],
        },
      };
    });

    afterEach(() => {
      removeAuthenticationController();
      (
        Engine.context as { SeedlessOnboardingController?: unknown }
      ).SeedlessOnboardingController = originalSeedless;
    });

    it('matches the in-app state log export', () => {
      const state = stateWithSecrets();
      mockedGetState.mockReturnValue(state);

      const result = captureExportedAppState();

      expect(result).toEqual(JSON.parse(generateStateLogs(state)));
    });

    it('omits authentication tokens and the keyring vault from the app export', () => {
      mockedGetState.mockReturnValue(stateWithSecrets());

      const result = captureExportedAppState();
      const serialized = JSON.stringify(result);
      const backgroundState = (
        result.engine as { backgroundState: Record<string, unknown> }
      ).backgroundState;

      expect(serialized).not.toContain(EXPORTED_SECRETS.vault);
      expect(serialized).not.toContain(EXPORTED_SECRETS.bearerToken);
      expect(serialized).not.toContain(EXPORTED_SECRETS.accessToken);
      expect(serialized).not.toContain(EXPORTED_SECRETS.refreshToken);
      expect(serialized).not.toContain(EXPORTED_SECRETS.encryptionKey);
      expect(serialized).not.toContain(EXPORTED_SECRETS.encryptionSalt);
      expect(serialized).not.toContain(EXPORTED_SECRETS.mnemonic);
      expect(serialized).not.toContain('paired-identifier-id');
      expect(serialized).not.toContain('user@example.com');
      expect(backgroundState.AuthenticationController).toEqual(
        SANITIZED_AUTHENTICATION_STATE,
      );
      expect(backgroundState.KeyringController).toEqual(
        expect.objectContaining({
          vaultExists: expect.any(Boolean),
        }),
      );
      expect(backgroundState.SeedlessOnboardingController).toEqual(
        expect.objectContaining({
          accessToken: true,
          refreshToken: true,
          vault: true,
          nodeAuthTokens: [{ nodeIndex: 0, nodePubKey: 'e2e-node-pub-key' }],
        }),
      );
    });
  });

  describe('handleExportAppStateCommand', () => {
    beforeEach(() => {
      installAuthenticationController();
      (
        Engine.context as {
          SeedlessOnboardingController: { state: Record<string, unknown> };
        }
      ).SeedlessOnboardingController = {
        state: {
          socialBackupsMetadata: [],
          nodeAuthTokens: [],
        },
      };
    });

    afterEach(() => {
      removeAuthenticationController();
    });

    it('posts the in-app state log export to the command queue server', async () => {
      const state = stateWithSecrets();
      mockedGetState.mockReturnValue(state);
      mockedAxios.post.mockResolvedValueOnce({ status: 200 });

      await handleExportAppStateCommand();

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:2446/exported-app-state',
        JSON.parse(generateStateLogs(state)),
      );
    });
  });
});

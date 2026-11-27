import {
  MutationRejectedError,
  type Identifier,
} from '@metamask/mfa-recovery-controller';
import { createSiweIdentifier } from '../../Engine/controllers/mfa-recovery-controller/auth/identifier-auth-provider';
import { createSrpSiweSigner } from '../../Engine/controllers/mfa-recovery-controller/auth/srp-siwe-signer';
import { linkSocialLogin } from '../social-login/link-social-login';
import {
  IdentifierNotApprovedError,
  MfaRecoveryService,
} from './mfa-recovery-service';
import {
  createMfaRecoveryServiceTestMessenger,
  createTestKeyringController,
  TEST_PRIMARY_ENTROPY_SOURCE_ID,
} from './mfa-recovery-service-test-messenger';

const ADDRESS = '0xAbC';
const SIWE = createSiweIdentifier(ADDRESS);
const AUTH_SIWE = { type: 'siwe', value: '0xdef' } as Identifier;
const PASSKEY: Identifier = {
  type: 'passkey',
  namespace: 'auth.example',
  value: 'credential',
};
const PROVABLE_PASSKEY: Identifier = {
  ...PASSKEY,
  verifier: { rpId: 'auth.example', credentialId: 'credential' },
};
const AUTH_PASSKEY: Identifier = {
  ...PASSKEY,
  verifier: { rpId: 'auth.example' },
};
const SOCIAL: Identifier = {
  type: 'social',
  namespace: 'https://accounts.google.com',
  value: 'google-user',
};
const AUTH_SOCIAL: Identifier = { ...SOCIAL, value: 'auth-social' };
const AUTH_APPLE: Identifier = {
  type: 'social',
  namespace: 'https://appleid.apple.com',
  value: 'auth-apple',
};
const RANDOM_BYTE = 7;
const RECOVERY_SECRET = new Uint8Array(32).fill(RANDOM_BYTE);
const REGISTERED_SECRET = new Uint8Array(32).fill(9);
const OPERATION = 'test.operation';
const AUTH_ENV = 'test-env';

const mockToprfConfig = {
  aal2Audience: 'toprf-aal2-audience',
  authConnectionId: 'toprf-auth-connection',
  groupedAuthConnectionId: 'toprf-grouped-auth-connection',
};
const controllers: Record<string, unknown> = {};

jest.mock('../../Engine/controllers/mfa-recovery-controller/config', () => ({
  RECOVERY_SECRET_LENGTH: 32,
  getToprfRecoveryConfig: () => mockToprfConfig,
}));

jest.mock('../social-login/link-social-login', () => ({
  linkSocialLogin: jest.fn(),
}));

jest.mock('../../apiEnv', () => ({
  authEnv: () => 'test-env',
}));

const mockLoggerLog = jest.fn();
jest.mock('../../../util/Logger', () => ({
  __esModule: true,
  default: { log: (...args: unknown[]) => mockLoggerLog(...args) },
}));

const mockLinkSocialLogin = jest.mocked(linkSocialLogin);

function createController({
  identifiers = [] as Identifier[],
  authIdentifiers = [AUTH_PASSKEY, AUTH_SOCIAL] as Identifier[],
  phase = 'idle',
  epoch = 3,
  recoverySecretLength = 32,
  isTrusted = async () => true,
}: {
  identifiers?: Identifier[];
  authIdentifiers?: Identifier[];
  phase?: string;
  epoch?: number;
  recoverySecretLength?: number;
  isTrusted?: (identifier: Identifier) => Promise<boolean>;
} = {}) {
  const readSecrets: Uint8Array[] = [];
  let currentEpoch = epoch;
  const state = { identifiers, authIdentifiers };
  const controller = {
    state,
    readSecrets,
    acquireLock: jest.fn().mockResolvedValue(undefined),
    releaseLock: jest.fn().mockResolvedValue(undefined),
    getPhase: jest.fn().mockResolvedValue(phase),
    resume: jest.fn().mockResolvedValue(undefined),
    abort: jest.fn().mockResolvedValue(undefined),
    isTrusted: jest.fn(isTrusted),
    getIdentifiers: jest.fn(async () => ({
      identifiers: state.identifiers,
      epoch: currentEpoch,
      authIdentifiers: state.authIdentifiers,
    })),
    updateIdentifiers: jest.fn(async () => {
      currentEpoch += 1;
    }),
    register: jest.fn().mockResolvedValue(undefined),
    authenticateIdentifier: jest.fn().mockResolvedValue('identifier-session'),
    getRecoverySecret: jest.fn(async () => {
      const recoverySecret = new Uint8Array(recoverySecretLength).fill(9);
      readSecrets.push(recoverySecret);
      return { epoch: 1, recoverySecret };
    }),
  };
  return controller;
}

/** Starts not envelope-managed; `migrateToEnvelope` sets the envelope. */
function createSeedless() {
  const state: {
    envelope?: { v: 1; vaultAuthPubKey: string };
    authConnection?: string;
    userId?: string;
    vault?: string;
  } = { authConnection: 'google', userId: 'google-user', vault: 'vault' };
  return {
    state,
    getAccessToken: jest.fn().mockResolvedValue('social-token'),
    authenticateForRecovery: jest.fn().mockResolvedValue(undefined),
    runMigrations: jest.fn().mockResolvedValue(false),
    migrateToEnvelope: jest.fn(async (_: { recoverySecret: Uint8Array }) => {
      state.envelope = { v: 1, vaultAuthPubKey: 'pk' };
    }),
  };
}

function createService({
  controller = createController(),
  seedless = createSeedless(),
  siweAddress = ADDRESS,
  keyring = createTestKeyringController(),
  getSocialLinkEmail,
}: {
  controller?: ReturnType<typeof createController>;
  seedless?: ReturnType<typeof createSeedless>;
  /** Stubs `getSiweAddress`; `null` derives it from `keyring`. */
  siweAddress?: string | null;
  keyring?: ReturnType<typeof createTestKeyringController>;
  getSocialLinkEmail?: () => Promise<string | undefined>;
} = {}) {
  const verifyMfa = jest.fn().mockResolvedValue(undefined);
  const requestMfaApproval = jest.fn(async () => ({ approval: 'aal2-token' }));
  const getVerificationToken = jest.fn(() => ({
    accessToken: 'verified-token',
  }));
  Object.assign(controllers, {
    MfaRecoveryController: controller,
    SeedlessOnboardingController: seedless,
    KeyringController: keyring,
    AuthenticationController: { requestMfaApproval, getVerificationToken },
  });
  const service = new MfaRecoveryService({
    messenger: createMfaRecoveryServiceTestMessenger(() => controllers),
    verifyMfa,
    approvalOperation: OPERATION,
    getSocialLinkEmail,
  });
  if (siweAddress !== null) {
    jest.spyOn(service, 'getSiweAddress').mockResolvedValue(siweAddress);
  }
  return {
    service,
    controller,
    seedless,
    verifyMfa,
    requestMfaApproval,
  };
}

/** Copies the secret at call time; setup zeroes it afterwards. */
function captureSecrets(
  controller: ReturnType<typeof createController>,
  seedless: ReturnType<typeof createSeedless>,
) {
  const captured: { registered?: Uint8Array; migrated?: Uint8Array } = {};
  controller.register.mockImplementation(async (secret: Uint8Array) => {
    captured.registered = new Uint8Array(secret);
  });
  const migrate = seedless.migrateToEnvelope.getMockImplementation();
  seedless.migrateToEnvelope.mockImplementation(async (params) => {
    captured.migrated = new Uint8Array(params.recoverySecret);
    await migrate?.(params);
  });
  return captured;
}

describe('MfaRecoveryService', () => {
  beforeEach(() => {
    jest
      .spyOn(globalThis.crypto, 'getRandomValues')
      .mockImplementation(<T extends ArrayBufferView | null>(array: T) => {
        (array as unknown as Uint8Array).fill(RANDOM_BYTE);
        return array;
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockLinkSocialLogin.mockReset();
  });

  it('reads the status through the messenger', () => {
    const seedless = createSeedless();
    const { service } = createService({ seedless });

    expect(service.getStatus()).toBe('NotEnabled');
    seedless.state.envelope = { v: 1, vaultAuthPubKey: 'pk' };
    expect(service.getStatus()).toBe('Enabled');
  });

  describe('getSiweAddress', () => {
    it("derives the address of the primary SRP's message-signing key", async () => {
      const seed = new Uint8Array(64).fill(5);
      const keyring = createTestKeyringController({ seed });
      const { service } = createService({ siweAddress: null, keyring });
      const expectedAddress = await createSrpSiweSigner({
        getSeed: async () => new Uint8Array(seed),
      }).getAddress();

      const address = await service.getSiweAddress();

      expect(address).toBe(expectedAddress);
      expect(keyring.withKeyringV2Unsafe).toHaveBeenCalledWith(
        { id: TEST_PRIMARY_ENTROPY_SOURCE_ID },
        expect.any(Function),
      );
    });

    it('throws primary_account_unavailable while the keyring is locked', async () => {
      const keyring = createTestKeyringController({ isUnlocked: false });
      const { service } = createService({ siweAddress: null, keyring });

      await expect(service.getSiweAddress()).rejects.toMatchObject({
        code: 'primary_account_unavailable',
      });
      expect(keyring.withKeyringV2Unsafe).not.toHaveBeenCalled();
    });
  });

  describe('findEnrolledPasskeyIdentifier', () => {
    it('returns the enrolled passkey with the credential ID', async () => {
      const { service } = createService({
        controller: createController({ identifiers: [SIWE, PASSKEY] }),
      });

      await expect(
        service.findEnrolledPasskeyIdentifier('credential'),
      ).resolves.toStrictEqual(PASSKEY);
    });

    it('returns undefined when Cubist has no passkey with the credential ID', async () => {
      const { service } = createService({
        controller: createController({ identifiers: [SIWE, PASSKEY] }),
      });

      await expect(
        service.findEnrolledPasskeyIdentifier('other-credential'),
      ).resolves.toBeUndefined();
    });
  });

  describe('getUnenrolledPasskeyIdentifiers', () => {
    const OTHER_AUTH_PASSKEY: Identifier = {
      ...AUTH_PASSKEY,
      value: 'other-credential',
    };

    it("returns Auth's passkeys that Cubist does not have", async () => {
      const { service } = createService({
        controller: createController({
          identifiers: [SIWE, PASSKEY],
          authIdentifiers: [AUTH_PASSKEY, OTHER_AUTH_PASSKEY, AUTH_SOCIAL],
        }),
      });

      await expect(
        service.getUnenrolledPasskeyIdentifiers(),
      ).resolves.toStrictEqual([OTHER_AUTH_PASSKEY]);
    });

    it('returns nothing when Cubist has every Auth passkey', async () => {
      const { service } = createService({
        controller: createController({
          identifiers: [SIWE, PASSKEY],
          authIdentifiers: [AUTH_PASSKEY],
        }),
      });

      await expect(
        service.getUnenrolledPasskeyIdentifiers(),
      ).resolves.toStrictEqual([]);
    });

    it('excludes untrusted passkeys returned by Auth', async () => {
      const UNTRUSTED_PASSKEY: Identifier = {
        ...AUTH_PASSKEY,
        value: 'rogue-credential',
      };
      const { service } = createService({
        controller: createController({
          identifiers: [SIWE, PASSKEY],
          authIdentifiers: [
            AUTH_PASSKEY,
            UNTRUSTED_PASSKEY,
            OTHER_AUTH_PASSKEY,
          ],
          isTrusted: async (identifier) =>
            identifier.value !== UNTRUSTED_PASSKEY.value,
        }),
      });

      await expect(
        service.getUnenrolledPasskeyIdentifiers(),
      ).resolves.toStrictEqual([OTHER_AUTH_PASSKEY]);
    });
  });

  describe('vault password methods', () => {
    it('forwards recovery and password calls to the seedless controller', async () => {
      const seedless = Object.assign(createSeedless(), {
        recoverWithRecoverySecret: jest.fn().mockResolvedValue(['secret']),
        resetPasswordWithVaultKeys: jest.fn().mockResolvedValue(undefined),
      });
      const { service } = createService({ seedless });

      await expect(
        service.recoverWithRecoverySecret(RECOVERY_SECRET, 'local-password'),
      ).resolves.toStrictEqual(['secret']);
      await service.resetGlobalPassword('new-password');

      expect(seedless.recoverWithRecoverySecret).toHaveBeenCalledWith({
        recoverySecret: RECOVERY_SECRET,
        password: 'local-password',
      });
      expect(seedless.resetPasswordWithVaultKeys).toHaveBeenCalledWith({
        newPassword: 'new-password',
      });
    });

    it('fetches the secrets with the cached key, passing no password', async () => {
      const seedless = Object.assign(createSeedless(), {
        fetchAllSecretData: jest.fn().mockResolvedValue(['secret']),
      });
      const { service } = createService({ seedless });

      await expect(service.fetchSecretsWithCachedKey()).resolves.toStrictEqual([
        'secret',
      ]);

      expect(seedless.fetchAllSecretData).toHaveBeenCalledWith();
    });
  });

  it('creates a random Recovery Secret', () => {
    const { service } = createService();

    expect(service.createRecoverySecret()).toStrictEqual(RECOVERY_SECRET);
  });

  describe('mintAal2Token', () => {
    it('mints the aal2 token for the configured TOPRF audience with the flow operation', async () => {
      const { service, requestMfaApproval } = createService();

      await expect(service.mintAal2Token()).resolves.toBe('aal2-token');

      expect(requestMfaApproval).toHaveBeenCalledWith({
        requestHash: `0x${'07'.repeat(32)}`,
        audiences: [mockToprfConfig.aal2Audience],
        requireVerification: true,
        includeIdentifiers: false,
        reason: { operation: OPERATION },
      });
    });
  });

  describe('verifyMfa', () => {
    it('verifies once per instance', async () => {
      const { service, verifyMfa } = createService();

      await service.verifyMfa();
      await service.verifyMfa();

      expect(verifyMfa).toHaveBeenCalledTimes(1);
    });

    it('verifies again after a failed verification', async () => {
      const { service, verifyMfa } = createService();
      const error = new Error('verification failed');
      verifyMfa.mockRejectedValueOnce(error);

      await expect(service.verifyMfa()).rejects.toBe(error);
      await service.verifyMfa();

      expect(verifyMfa).toHaveBeenCalledTimes(2);
    });
  });

  describe('getStatus', () => {
    it('is NotEnabled until the vault is envelope-managed', async () => {
      const { service } = createService({
        controller: createController({ epoch: 0 }),
      });

      expect(service.getStatus()).toBe('NotEnabled');
      await service.setUp();
      expect(service.getStatus()).toBe('Enabled');
    });
  });

  describe('readRecoverySecret', () => {
    it('authenticates the identifier and reads the secret with its session', async () => {
      const { service, controller } = createService();

      const result = await service.readRecoverySecret(SIWE);

      expect(controller.authenticateIdentifier).toHaveBeenCalledWith(SIWE);
      expect(controller.getRecoverySecret).toHaveBeenCalledWith(
        'identifier-session',
      );
      expect(result).toStrictEqual({
        epoch: 1,
        recoverySecret: REGISTERED_SECRET,
      });
    });

    it("returns a copy and zeroes the controller's buffer", async () => {
      const { service, controller } = createService();

      const { recoverySecret } = await service.readRecoverySecret(SIWE);

      const [controllerSecret] = controller.readSecrets;
      expect(recoverySecret).not.toBe(controllerSecret);
      expect(controllerSecret).toStrictEqual(new Uint8Array(32));
    });

    it('throws recovery_secret_invalid for a secret of the wrong length and zeroes it', async () => {
      const controller = createController({ recoverySecretLength: 16 });
      const { service } = createService({ controller });

      await expect(service.readRecoverySecret(SIWE)).rejects.toMatchObject({
        code: 'recovery_secret_invalid',
      });
      expect(controller.readSecrets[0]).toStrictEqual(new Uint8Array(16));
    });
  });

  describe('openRecoverySession', () => {
    it('authenticates with the configured TOPRF connection and an aal2 token', async () => {
      const { service, seedless } = createService();

      await service.openRecoverySession();

      expect(seedless.authenticateForRecovery).toHaveBeenCalledWith({
        aal2Token: 'aal2-token',
        authConnectionId: mockToprfConfig.authConnectionId,
        groupedAuthConnectionId: mockToprfConfig.groupedAuthConnectionId,
      });
    });
  });

  describe('findRecoveryIdentifier', () => {
    it("returns the enrolled passkey as Auth's copy with its verifier for the passkey type", async () => {
      const controller = createController({
        identifiers: [SIWE, PASSKEY, SOCIAL],
        authIdentifiers: [PASSKEY, SOCIAL],
      });
      const { service, verifyMfa } = createService({ controller });

      await expect(
        service.findRecoveryIdentifier({
          identifierType: 'passkey',
          canProveSocialIdentifier: true,
        }),
      ).resolves.toStrictEqual(PROVABLE_PASSKEY);
      expect(verifyMfa).not.toHaveBeenCalled();
    });

    it('returns null for the passkey type when only social is approved', async () => {
      const controller = createController({
        identifiers: [SIWE, PASSKEY, SOCIAL],
        authIdentifiers: [SOCIAL],
      });
      const { service } = createService({ controller });

      await expect(
        service.findRecoveryIdentifier({
          identifierType: 'passkey',
          canProveSocialIdentifier: true,
        }),
      ).resolves.toBeNull();
    });

    it('returns the approved social identifier for the social type', async () => {
      const controller = createController({
        identifiers: [SIWE, PASSKEY, SOCIAL],
        authIdentifiers: [PASSKEY, SOCIAL],
      });
      const { service, verifyMfa } = createService({ controller });

      await expect(
        service.findRecoveryIdentifier({
          identifierType: 'social',
          canProveSocialIdentifier: true,
        }),
      ).resolves.toBe(SOCIAL);
      expect(verifyMfa).not.toHaveBeenCalled();
    });

    it('returns null for the social type when the social login cannot be proven', async () => {
      const controller = createController({
        identifiers: [SIWE, SOCIAL],
        authIdentifiers: [SOCIAL],
      });
      const { service } = createService({ controller });

      await expect(
        service.findRecoveryIdentifier({
          identifierType: 'social',
          canProveSocialIdentifier: false,
        }),
      ).resolves.toBeNull();
    });

    it('returns null for the social type when only a passkey is approved', async () => {
      const controller = createController({
        identifiers: [SIWE, PASSKEY, SOCIAL],
        authIdentifiers: [PASSKEY],
      });
      const { service } = createService({ controller });

      await expect(
        service.findRecoveryIdentifier({
          identifierType: 'social',
          canProveSocialIdentifier: true,
        }),
      ).resolves.toBeNull();
    });

    it('returns null for each type when nothing enrolled is approved', async () => {
      const controller = createController({
        identifiers: [SIWE],
        authIdentifiers: [PASSKEY, SOCIAL],
      });
      const { service } = createService({ controller });

      await expect(
        service.findRecoveryIdentifier({
          identifierType: 'passkey',
          canProveSocialIdentifier: true,
        }),
      ).resolves.toBeNull();
      await expect(
        service.findRecoveryIdentifier({
          identifierType: 'social',
          canProveSocialIdentifier: true,
        }),
      ).resolves.toBeNull();
    });
  });

  describe('linkSocialLogin', () => {
    it('verifies before linking with the given email', async () => {
      const { service, verifyMfa, seedless } = createService();
      const order: string[] = [];
      verifyMfa.mockImplementation(async () => {
        order.push('verify');
      });
      mockLinkSocialLogin.mockImplementation(async () => {
        order.push('link');
      });

      await service.linkSocialLogin('dev@example.com');

      expect(order).toStrictEqual(['verify', 'link']);
      expect(mockLinkSocialLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          env: AUTH_ENV,
          seedlessState: seedless.state,
          verifierId: 'dev@example.com',
        }),
      );
    });

    it('does not link when verification fails', async () => {
      const { service, verifyMfa } = createService();
      verifyMfa.mockRejectedValue(new Error('cancelled'));

      await expect(service.linkSocialLogin()).rejects.toThrow('cancelled');
      expect(mockLinkSocialLogin).not.toHaveBeenCalled();
    });
  });

  describe('setUp', () => {
    function createSetUpService(
      options: Parameters<typeof createService>[0] = {},
    ) {
      return createService({
        controller: createController({ epoch: 0 }),
        ...options,
      });
    }

    it('returns already_enabled without verifying when the vault is sealed', async () => {
      const seedless = createSeedless();
      seedless.state.envelope = { v: 1, vaultAuthPubKey: 'pk' };
      const { service, controller, verifyMfa } = createSetUpService({
        seedless,
      });

      await expect(service.setUp()).resolves.toBe('already_enabled');
      expect(verifyMfa).not.toHaveBeenCalled();
      expect(controller.getIdentifiers).not.toHaveBeenCalled();
      expect(controller.register).not.toHaveBeenCalled();
    });

    it('throws primary_account_unavailable without verifying when the keyring is locked', async () => {
      const { service, verifyMfa } = createSetUpService({
        siweAddress: null,
        keyring: createTestKeyringController({ isUnlocked: false }),
      });

      await expect(service.setUp()).rejects.toMatchObject({
        code: 'primary_account_unavailable',
      });
      expect(verifyMfa).not.toHaveBeenCalled();
    });

    it('verifies and resumes a pending operation', async () => {
      const controller = createController({ epoch: 0, phase: 'writing' });
      const { service, verifyMfa } = createSetUpService({ controller });

      await service.setUp();

      expect(verifyMfa).toHaveBeenCalledTimes(1);
      expect(controller.resume).toHaveBeenCalledTimes(1);
    });

    it('continues when resume clears an unapplied pending operation with MutationRejectedError', async () => {
      const controller = createController({ epoch: 0, phase: 'authorizing' });
      controller.resume.mockRejectedValueOnce(
        new MutationRejectedError('unapplied pending operation'),
      );
      const { service } = createSetUpService({ controller });

      await expect(service.setUp()).resolves.toBe('enabled');
      expect(mockLoggerLog).toHaveBeenCalledWith(
        'MfaRecovery cleared unapplied pending operation',
        { message: 'unapplied pending operation' },
      );
    });

    it('registers SIWE, social, and trusted passkeys with a single getIdentifiers read', async () => {
      const { service, controller, seedless } = createSetUpService();
      const captured = captureSecrets(controller, seedless);

      await expect(service.setUp()).resolves.toBe('enabled');

      expect(controller.getIdentifiers).toHaveBeenCalledTimes(1);
      expect(controller.register).toHaveBeenCalledWith(expect.any(Uint8Array), [
        SIWE,
        AUTH_SOCIAL,
        AUTH_PASSKEY,
      ]);
      expect(captured.registered).toStrictEqual(RECOVERY_SECRET);
      expect(captured.migrated).toStrictEqual(RECOVERY_SECRET);
      expect(mockLinkSocialLogin).not.toHaveBeenCalled();
    });

    it('prefers the Auth SIWE identifier when present', async () => {
      const { service, controller } = createSetUpService({
        controller: createController({
          epoch: 0,
          authIdentifiers: [AUTH_SIWE, AUTH_SOCIAL, AUTH_PASSKEY],
        }),
      });

      await service.setUp();

      expect(controller.register).toHaveBeenCalledWith(expect.any(Uint8Array), [
        AUTH_SIWE,
        AUTH_SOCIAL,
        AUTH_PASSKEY,
      ]);
    });

    it('registers SIWE and social when Auth has no passkey and requirePasskey is false', async () => {
      const { service, controller } = createSetUpService({
        controller: createController({
          epoch: 0,
          authIdentifiers: [AUTH_SOCIAL],
        }),
      });

      await expect(service.setUp()).resolves.toBe('enabled');

      expect(controller.getIdentifiers).toHaveBeenCalledTimes(1);
      expect(controller.register).toHaveBeenCalledWith(expect.any(Uint8Array), [
        SIWE,
        AUTH_SOCIAL,
      ]);
    });

    it('throws IdentifierNotApprovedError before linking social when requirePasskey is true and no trusted passkey exists', async () => {
      const UNTRUSTED_PASSKEY: Identifier = {
        ...AUTH_PASSKEY,
        value: 'rogue-credential',
      };
      const controller = createController({
        epoch: 0,
        authIdentifiers: [UNTRUSTED_PASSKEY],
        isTrusted: async () => false,
      });
      const { service } = createSetUpService({ controller });

      await expect(
        service.setUp({ requirePasskey: true }),
      ).rejects.toBeInstanceOf(IdentifierNotApprovedError);
      expect(mockLinkSocialLogin).not.toHaveBeenCalled();
      expect(controller.register).not.toHaveBeenCalled();
    });

    it('skips untrusted passkeys from Auth during registration', async () => {
      const UNTRUSTED_PASSKEY: Identifier = {
        ...AUTH_PASSKEY,
        value: 'rogue-credential',
      };
      const controller = createController({
        epoch: 0,
        authIdentifiers: [UNTRUSTED_PASSKEY, AUTH_PASSKEY, AUTH_SOCIAL],
        isTrusted: async (identifier) =>
          identifier.value !== UNTRUSTED_PASSKEY.value,
      });
      const { service } = createSetUpService({ controller });

      await expect(service.setUp({ requirePasskey: true })).resolves.toBe(
        'enabled',
      );

      expect(controller.register).toHaveBeenCalledWith(expect.any(Uint8Array), [
        SIWE,
        AUTH_SOCIAL,
        AUTH_PASSKEY,
      ]);
    });

    it("registers only the social identifier for the seedless login's issuer", async () => {
      const { service, controller } = createSetUpService({
        controller: createController({
          epoch: 0,
          authIdentifiers: [AUTH_APPLE, AUTH_SOCIAL],
        }),
      });

      await service.setUp();

      expect(controller.register).toHaveBeenCalledWith(expect.any(Uint8Array), [
        SIWE,
        AUTH_SOCIAL,
      ]);
    });

    it('links the social login when Auth lists none, then reads the identifiers again', async () => {
      const controller = createController({
        epoch: 0,
        authIdentifiers: [AUTH_PASSKEY],
      });
      const { service, seedless } = createSetUpService({ controller });
      mockLinkSocialLogin.mockImplementation(async () => {
        controller.state.authIdentifiers = [AUTH_PASSKEY, AUTH_SOCIAL];
      });

      await service.setUp({ requirePasskey: true });

      expect(mockLinkSocialLogin).toHaveBeenCalledTimes(1);
      const [dependencies] = mockLinkSocialLogin.mock.calls[0];
      expect(dependencies).toStrictEqual({
        env: AUTH_ENV,
        seedlessState: seedless.state,
        getSocialAccessToken: expect.any(Function),
        getVerifiedAccessToken: expect.any(Function),
        verifierId: undefined,
      });
      await expect(dependencies.getSocialAccessToken()).resolves.toBe(
        'social-token',
      );
      expect(dependencies.getVerifiedAccessToken()).toBe('verified-token');
      expect(controller.getIdentifiers).toHaveBeenCalledTimes(2);
      expect(controller.register).toHaveBeenCalledWith(expect.any(Uint8Array), [
        SIWE,
        AUTH_SOCIAL,
        AUTH_PASSKEY,
      ]);
    });

    it('links with the trimmed email from getSocialLinkEmail', async () => {
      const getSocialLinkEmail = jest
        .fn()
        .mockResolvedValue('  dev@example.com ');
      const controller = createController({
        epoch: 0,
        authIdentifiers: [AUTH_PASSKEY],
      });
      const { service } = createSetUpService({
        controller,
        getSocialLinkEmail,
      });
      mockLinkSocialLogin.mockImplementation(async () => {
        controller.state.authIdentifiers = [AUTH_PASSKEY, AUTH_SOCIAL];
      });

      await service.setUp();

      expect(mockLinkSocialLogin).toHaveBeenCalledWith(
        expect.objectContaining({ verifierId: 'dev@example.com' }),
      );
    });

    it('does not ask for the link email when Auth already lists the social identifier', async () => {
      const getSocialLinkEmail = jest.fn();
      const { service } = createSetUpService({ getSocialLinkEmail });

      await service.setUp();

      expect(getSocialLinkEmail).not.toHaveBeenCalled();
      expect(mockLinkSocialLogin).not.toHaveBeenCalled();
    });

    it('throws social_identifier_not_approved when linking does not add it', async () => {
      const controller = createController({
        epoch: 0,
        authIdentifiers: [AUTH_PASSKEY],
      });
      const { service, seedless } = createSetUpService({ controller });
      mockLinkSocialLogin.mockResolvedValue(undefined);

      await expect(service.setUp()).rejects.toMatchObject({
        code: 'social_identifier_not_approved',
      });
      expect(controller.register).not.toHaveBeenCalled();
      expect(seedless.migrateToEnvelope).not.toHaveBeenCalled();
    });

    it('does not register when linking the social login fails', async () => {
      const controller = createController({
        epoch: 0,
        authIdentifiers: [AUTH_PASSKEY],
      });
      const { service } = createSetUpService({ controller });
      const error = new Error('link failed');
      mockLinkSocialLogin.mockRejectedValue(error);

      await expect(service.setUp()).rejects.toBe(error);
      expect(controller.register).not.toHaveBeenCalled();
    });

    it('registers, authenticates, migrates data types, then seals the vault', async () => {
      const order: string[] = [];
      const { service, controller, seedless } = createSetUpService();
      controller.register.mockImplementation(async () => {
        order.push('register');
      });
      seedless.authenticateForRecovery.mockImplementation(async () => {
        order.push('authenticate');
      });
      seedless.runMigrations.mockImplementation(async () => {
        order.push('runMigrations');
        return false;
      });
      seedless.migrateToEnvelope.mockImplementation(async () => {
        order.push('migrate');
      });

      await service.setUp();

      expect(order).toStrictEqual([
        'register',
        'authenticate',
        'runMigrations',
        'migrate',
      ]);
      expect(seedless.authenticateForRecovery).toHaveBeenCalledWith({
        aal2Token: 'aal2-token',
        authConnectionId: mockToprfConfig.authConnectionId,
        groupedAuthConnectionId: mockToprfConfig.groupedAuthConnectionId,
      });
    });

    it('reads the existing secret with SIWE and does not register when the escrow already has one', async () => {
      const controller = createController({
        epoch: 2,
        identifiers: [SIWE, AUTH_SOCIAL, AUTH_PASSKEY],
      });
      const seedless = createSeedless();
      const captured = captureSecrets(controller, seedless);
      const { service } = createService({ controller, seedless });

      await expect(service.setUp()).resolves.toBe('enabled');

      expect(controller.register).not.toHaveBeenCalled();
      expect(controller.updateIdentifiers).not.toHaveBeenCalled();
      expect(controller.authenticateIdentifier).toHaveBeenCalledWith(SIWE);
      expect(controller.authenticateIdentifier).not.toHaveBeenCalledWith(
        PROVABLE_PASSKEY,
      );
      expect(mockLoggerLog).toHaveBeenCalledWith(
        'MfaRecovery setUp: reading existing secret',
        { epoch: 2 },
      );
      expect(captured.migrated).toStrictEqual(REGISTERED_SECRET);
      expect(controller.readSecrets[0]).toStrictEqual(new Uint8Array(32));
    });

    it('adds missing trusted passkeys to Cubist when retrying setup at epoch > 0', async () => {
      const controller = createController({
        epoch: 2,
        identifiers: [SIWE, SOCIAL],
        authIdentifiers: [AUTH_PASSKEY, AUTH_SOCIAL],
      });
      const seedless = createSeedless();
      const captured = captureSecrets(controller, seedless);
      const { service } = createService({ controller, seedless });

      await expect(service.setUp()).resolves.toBe('enabled');

      expect(controller.register).not.toHaveBeenCalled();
      expect(controller.updateIdentifiers).toHaveBeenCalledWith(
        SIWE,
        [SIWE, SOCIAL, AUTH_PASSKEY],
        2,
      );
      expect(controller.authenticateIdentifier).toHaveBeenCalledWith(SIWE);
      expect(captured.migrated).toStrictEqual(REGISTERED_SECRET);
      expect(controller.readSecrets[0]).toStrictEqual(new Uint8Array(32));
    });

    it('zeroes the secret after sealing the vault', async () => {
      const { service, controller, seedless } = createSetUpService();

      await service.setUp();

      const [secret] = controller.register.mock.calls[0];
      expect(secret).toStrictEqual(new Uint8Array(32));
      expect(seedless.migrateToEnvelope.mock.calls[0][0].recoverySecret).toBe(
        secret,
      );
    });

    it('zeroes the secret and does not seal the vault when the escrow registration fails', async () => {
      const { service, controller, seedless } = createSetUpService();
      const error = new Error('register failed');
      controller.register.mockRejectedValueOnce(error);

      await expect(service.setUp()).rejects.toBe(error);
      expect(controller.register.mock.calls[0][0]).toStrictEqual(
        new Uint8Array(32),
      );
      expect(seedless.migrateToEnvelope).not.toHaveBeenCalled();
    });
  });

  describe('addIdentifier', () => {
    it('verifies MFA and adds the identifier, authorizing with SIWE', async () => {
      const controller = createController({ identifiers: [SIWE, SOCIAL] });
      const { service, verifyMfa } = createService({ controller });

      const result = await service.addIdentifier(AUTH_PASSKEY);

      expect(verifyMfa).toHaveBeenCalled();
      expect(controller.updateIdentifiers).toHaveBeenCalledWith(
        SIWE,
        [SIWE, SOCIAL, AUTH_PASSKEY],
        3,
      );
      expect(result).toStrictEqual({
        identifierType: 'passkey',
        change: 'added',
        epoch: 4,
      });
    });

    it('resumes a pending operation first', async () => {
      const controller = createController({
        identifiers: [SIWE, SOCIAL],
        phase: 'writing',
      });
      const { service } = createService({ controller });

      await service.addIdentifier(AUTH_PASSKEY);

      expect(controller.resume).toHaveBeenCalled();
    });

    it('adds another passkey when Cubist already has one', async () => {
      const controller = createController({ identifiers: [SIWE, PASSKEY] });
      const { service } = createService({ controller });
      const otherPasskey = { ...AUTH_PASSKEY, value: 'other-credential' };

      await service.addIdentifier(otherPasskey);

      expect(controller.updateIdentifiers).toHaveBeenCalledWith(
        SIWE,
        [SIWE, AUTH_PASSKEY, otherPasskey],
        3,
      );
    });

    it('rejects a passkey that is already enrolled', async () => {
      const controller = createController({ identifiers: [SIWE, PASSKEY] });
      const { service } = createService({ controller });

      await expect(service.addIdentifier(AUTH_PASSKEY)).rejects.toMatchObject({
        code: 'identifier_already_enrolled',
      });
      expect(controller.updateIdentifiers).not.toHaveBeenCalled();
    });

    it('rejects a non-passkey identifier whose type is already enrolled', async () => {
      const controller = createController({ identifiers: [SIWE, SOCIAL] });
      const { service } = createService({ controller });

      await expect(
        service.addIdentifier({ ...SOCIAL, value: 'other-user' }),
      ).rejects.toMatchObject({ code: 'identifier_already_enrolled' });
      expect(controller.updateIdentifiers).not.toHaveBeenCalled();
    });
  });

  describe('removeIdentifier', () => {
    it('removes the identifier and passes the enrolled set with Auth copies', async () => {
      const controller = createController({
        identifiers: [SIWE, PASSKEY, SOCIAL],
      });
      const { service } = createService({ controller });

      const result = await service.removeIdentifier(SOCIAL);

      expect(controller.updateIdentifiers).toHaveBeenCalledWith(
        SIWE,
        [SIWE, AUTH_PASSKEY],
        3,
      );
      expect(result).toStrictEqual({
        identifierType: 'social',
        change: 'removed',
        epoch: 4,
      });
    });

    it('authorizes with a remaining identifier when SIWE is removed', async () => {
      const controller = createController({
        identifiers: [SIWE, PASSKEY, SOCIAL],
      });
      const { service } = createService({ controller });

      await service.removeIdentifier(SIWE);

      expect(controller.updateIdentifiers).toHaveBeenCalledWith(
        AUTH_PASSKEY,
        [AUTH_PASSKEY, SOCIAL],
        3,
      );
    });

    it('rejects removing below two identifiers', async () => {
      const controller = createController({ identifiers: [SIWE, SOCIAL] });
      const { service } = createService({ controller });

      await expect(service.removeIdentifier(SOCIAL)).rejects.toMatchObject({
        code: 'too_few_identifiers',
      });
      expect(controller.updateIdentifiers).not.toHaveBeenCalled();
    });

    it('rejects an identifier that is not enrolled', async () => {
      const controller = createController({ identifiers: [SIWE, SOCIAL] });
      const { service } = createService({ controller });

      await expect(service.removeIdentifier(PASSKEY)).rejects.toMatchObject({
        code: 'identifier_not_enrolled',
      });
    });
  });

  describe('recovery lock lifecycle', () => {
    it('acquires the lock before reading and releases it after setUp succeeds', async () => {
      const order: string[] = [];
      const controller = createController({ epoch: 0 });
      controller.acquireLock.mockImplementationOnce(async () => {
        order.push('acquireLock');
      });
      controller.getIdentifiers.mockImplementationOnce(async () => {
        order.push('getIdentifiers');
        return {
          identifiers: controller.state.identifiers,
          epoch: 0,
          authIdentifiers: controller.state.authIdentifiers,
        };
      });
      controller.register.mockImplementationOnce(async () => {
        order.push('register');
      });
      controller.releaseLock.mockImplementationOnce(async () => {
        order.push('releaseLock');
      });
      const { service } = createService({ controller });

      await expect(service.setUp()).resolves.toBe('enabled');

      expect(order).toStrictEqual([
        'acquireLock',
        'getIdentifiers',
        'register',
        'releaseLock',
      ]);
    });

    it('releases the lock when setUp fails and preserves the original error if releaseLock throws', async () => {
      const controller = createController({ epoch: 0 });
      const { service } = createService({ controller });
      const registerError = new Error('register failed');
      const releaseError = new Error('pending_mutation');
      controller.register.mockRejectedValueOnce(registerError);
      controller.releaseLock.mockRejectedValueOnce(releaseError);

      await expect(service.setUp()).rejects.toBe(registerError);
      expect(controller.acquireLock).toHaveBeenCalledTimes(1);
      expect(controller.releaseLock).toHaveBeenCalledTimes(1);
    });

    it('does not release the lock if acquireLock fails', async () => {
      const controller = createController({ epoch: 0 });
      const { service } = createService({ controller });
      const lockError = new Error('recovery_lock_conflict');
      controller.acquireLock.mockRejectedValueOnce(lockError);

      await expect(service.setUp()).rejects.toBe(lockError);
      expect(controller.getIdentifiers).not.toHaveBeenCalled();
      expect(controller.releaseLock).not.toHaveBeenCalled();
    });

    it('acquires and releases the lock around addIdentifier and removeIdentifier', async () => {
      const controller = createController({
        identifiers: [SIWE, SOCIAL],
      });
      const { service } = createService({ controller });

      await service.addIdentifier(AUTH_PASSKEY);
      expect(controller.acquireLock).toHaveBeenCalledTimes(1);
      expect(controller.releaseLock).toHaveBeenCalledTimes(1);

      controller.state.identifiers = [SIWE, PASSKEY, SOCIAL];
      await service.removeIdentifier(SOCIAL);
      expect(controller.acquireLock).toHaveBeenCalledTimes(2);
      expect(controller.releaseLock).toHaveBeenCalledTimes(2);

      // Even when validation rejects, the lock is still released.
      controller.state.identifiers = [SIWE, SOCIAL];
      await expect(service.removeIdentifier(PASSKEY)).rejects.toMatchObject({
        code: 'identifier_not_enrolled',
      });
      expect(controller.acquireLock).toHaveBeenCalledTimes(3);
      expect(controller.releaseLock).toHaveBeenCalledTimes(3);
    });
  });
});

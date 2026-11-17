import type { Identifier } from '@metamask/mfa-recovery-controller';
import { linkSocialLogin } from '../../../../MfaRecovery/linkSocialLogin';
import { createSiweIdentifier } from '../auth/identifiers';
import { MfaRecoveryService } from './mfa-recovery-service';

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
const mockCubistAuthAudience = 'cubist-auth-audience';
const mockEngineContext: Record<string, unknown> = {};

jest.mock('../../../../Engine', () => ({
  __esModule: true,
  default: {
    get context() {
      return mockEngineContext;
    },
  },
}));

jest.mock('../config', () => ({
  getToprfRecoveryConfig: () => mockToprfConfig,
  getCubistConfig: () => ({ authAudience: mockCubistAuthAudience }),
}));

jest.mock('../../../../MfaRecovery/linkSocialLogin', () => ({
  linkSocialLogin: jest.fn(),
}));

jest.mock('../../../../apiEnv', () => ({
  authEnv: () => 'test-env',
}));

const mockLinkSocialLogin = jest.mocked(linkSocialLogin);

function createController({
  identifiers = [] as Identifier[],
  authIdentifiers = [AUTH_PASSKEY] as Identifier[],
  phase = 'idle',
  epoch = 3,
  recoverySecretLength = 32,
} = {}) {
  const readSecrets: Uint8Array[] = [];
  return {
    readSecrets,
    getPhase: jest.fn().mockResolvedValue(phase),
    resume: jest.fn().mockResolvedValue(undefined),
    abort: jest.fn().mockResolvedValue(undefined),
    getIdentifiers: jest
      .fn()
      .mockResolvedValueOnce({ identifiers, epoch, authIdentifiers })
      .mockResolvedValue({
        identifiers: [],
        epoch: epoch + 1,
        authIdentifiers,
      }),
    updateIdentifiers: jest.fn().mockResolvedValue(undefined),
    register: jest.fn().mockResolvedValue(undefined),
    authenticateIdentifier: jest.fn().mockResolvedValue('identifier-session'),
    getRecoverySecret: jest.fn(async () => {
      const recoverySecret = new Uint8Array(recoverySecretLength).fill(9);
      readSecrets.push(recoverySecret);
      return { epoch: 1, recoverySecret };
    }),
  };
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
  authIdentifiers = [AUTH_PASSKEY, AUTH_SOCIAL],
  address = ADDRESS,
}: {
  controller?: ReturnType<typeof createController>;
  seedless?: ReturnType<typeof createSeedless>;
  authIdentifiers?: Identifier[];
  address?: string;
} = {}) {
  const auth = { identifiers: authIdentifiers };
  const verifyMfa = jest.fn().mockResolvedValue(undefined);
  const requestMfaApproval = jest.fn(
    async ({ includeIdentifiers }: { includeIdentifiers: boolean }) =>
      includeIdentifiers
        ? { approval: 'cubist-approval', identifiers: auth.identifiers }
        : { approval: 'aal2-token' },
  );
  const getVerificationToken = jest.fn(() => ({
    accessToken: 'verified-token',
  }));
  Object.assign(mockEngineContext, {
    MfaRecoveryController: controller,
    SeedlessOnboardingController: seedless,
    KeyringController: {
      state: { keyrings: [{ accounts: address ? [address] : [] }] },
    },
    AuthenticationController: { requestMfaApproval, getVerificationToken },
  });
  const service = new MfaRecoveryService({
    verifyMfa,
    approvalOperation: OPERATION,
  });
  return {
    service,
    controller,
    seedless,
    auth,
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

describe('MfaRecoveryService.getInstance', () => {
  it('returns the same instance for the same approval operation', () => {
    const options = {
      verifyMfa: jest.fn(),
      approvalOperation: 'test.singleton_same_operation',
    };

    const first = MfaRecoveryService.getInstance(options);
    const second = MfaRecoveryService.getInstance({
      verifyMfa: jest.fn(),
      approvalOperation: 'test.singleton_same_operation',
    });

    expect(second).toBe(first);
  });

  it('returns separate instances for different approval operations', () => {
    const verifyMfa = jest.fn();

    const first = MfaRecoveryService.getInstance({
      verifyMfa,
      approvalOperation: 'test.singleton_operation_a',
    });
    const second = MfaRecoveryService.getInstance({
      verifyMfa,
      approvalOperation: 'test.singleton_operation_b',
    });

    expect(second).not.toBe(first);
  });

  it('keeps the first call options for an operation', async () => {
    const firstVerify = jest.fn().mockResolvedValue(undefined);
    const secondVerify = jest.fn().mockResolvedValue(undefined);
    const service = MfaRecoveryService.getInstance({
      verifyMfa: firstVerify,
      approvalOperation: 'test.singleton_first_options',
    });
    MfaRecoveryService.getInstance({
      verifyMfa: secondVerify,
      approvalOperation: 'test.singleton_first_options',
    });

    await service.verifyMfa();

    expect(firstVerify).toHaveBeenCalledTimes(1);
    expect(secondVerify).not.toHaveBeenCalled();
  });
});

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

  it('reads the controllers and primary account from Engine', () => {
    const controller = createController();
    const seedless = createSeedless();
    const { service } = createService({ controller, seedless });

    expect(service.mfaRecoveryController).toBe(controller);
    expect(service.seedlessOnboardingController).toBe(seedless);
    expect(service.address).toBe(ADDRESS);
  });

  it('creates a random Recovery Secret', () => {
    const { service } = createService();

    expect(service.createRecoverySecret()).toStrictEqual(RECOVERY_SECRET);
  });

  describe('approvals', () => {
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

    it('reads the Auth identifiers for the configured Cubist audience', async () => {
      const { service, requestMfaApproval } = createService();

      await expect(service.getAuthIdentifiers()).resolves.toStrictEqual([
        AUTH_PASSKEY,
        AUTH_SOCIAL,
      ]);

      expect(requestMfaApproval).toHaveBeenCalledWith({
        requestHash: `0x${'07'.repeat(32)}`,
        audiences: [mockCubistAuthAudience],
        requireVerification: true,
        includeIdentifiers: true,
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

  describe('prepareRun', () => {
    it('throws primary_account_unavailable without an address', async () => {
      const { service, verifyMfa } = createService({ address: '' });

      await expect(service.prepareRun()).rejects.toMatchObject({
        code: 'primary_account_unavailable',
      });
      expect(verifyMfa).not.toHaveBeenCalled();
    });

    it('verifies and resumes a pending operation', async () => {
      const controller = createController({ phase: 'writing' });
      const { service, verifyMfa } = createService({ controller });

      await service.prepareRun();

      expect(verifyMfa).toHaveBeenCalledTimes(1);
      expect(controller.resume).toHaveBeenCalledTimes(1);
    });

    it('does not link the social login', async () => {
      const { service } = createService({ authIdentifiers: [AUTH_PASSKEY] });

      await service.prepareRun();

      expect(mockLinkSocialLogin).not.toHaveBeenCalled();
    });

    it('prefers the Auth SIWE identifier', async () => {
      const { service } = createService({
        authIdentifiers: [AUTH_SIWE, AUTH_PASSKEY],
      });

      const identifiers = await service.prepareRun();

      expect(identifiers.siweIdentifier).toBe(AUTH_SIWE);
      expect(identifiers.passkeyIdentifier).toBe(AUTH_PASSKEY);
    });

    it('falls back to the primary account SIWE identifier', async () => {
      const { service } = createService({ authIdentifiers: [] });

      const identifiers = await service.prepareRun();

      expect(identifiers.siweIdentifier).toStrictEqual(SIWE);
    });

    it('throws identifier_not_approved only when the missing passkey is read', async () => {
      const { service } = createService({ authIdentifiers: [] });

      const identifiers = await service.prepareRun();

      expect(() => identifiers.passkeyIdentifier).toThrow(
        expect.objectContaining({ code: 'identifier_not_approved' }),
      );
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
    it("prefers the enrolled passkey, using Auth's copy with its verifier", async () => {
      const controller = createController({
        identifiers: [SIWE, PASSKEY, SOCIAL],
        authIdentifiers: [PASSKEY, SOCIAL],
      });
      const { service, verifyMfa } = createService({ controller });

      await expect(
        service.findRecoveryIdentifier({ canProveSocialIdentifier: true }),
      ).resolves.toStrictEqual(PROVABLE_PASSKEY);
      expect(verifyMfa).not.toHaveBeenCalled();
    });

    it('ignores a passkey Auth did not approve', async () => {
      const controller = createController({
        identifiers: [SIWE, PASSKEY, SOCIAL],
        authIdentifiers: [SOCIAL],
      });
      const { service } = createService({ controller });

      await expect(
        service.findRecoveryIdentifier({ canProveSocialIdentifier: true }),
      ).resolves.toBe(SOCIAL);
    });

    it('returns null without a passkey when the social login cannot be proven', async () => {
      const controller = createController({
        identifiers: [SIWE, SOCIAL],
        authIdentifiers: [SOCIAL],
      });
      const { service } = createService({ controller });

      await expect(
        service.findRecoveryIdentifier({ canProveSocialIdentifier: false }),
      ).resolves.toBeNull();
    });

    it('returns null when nothing enrolled is approved', async () => {
      const controller = createController({
        identifiers: [SIWE],
        authIdentifiers: [PASSKEY, SOCIAL],
      });
      const { service } = createService({ controller });

      await expect(
        service.findRecoveryIdentifier({ canProveSocialIdentifier: true }),
      ).resolves.toBeNull();
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
      expect(controller.register).not.toHaveBeenCalled();
    });

    it("registers a fresh secret with SIWE, Auth's social identifier, and the given passkey", async () => {
      const { service, controller, seedless } = createSetUpService();
      const captured = captureSecrets(controller, seedless);

      await expect(service.setUp([AUTH_PASSKEY])).resolves.toBe('enabled');

      expect(controller.register).toHaveBeenCalledWith(expect.any(Uint8Array), [
        SIWE,
        AUTH_SOCIAL,
        AUTH_PASSKEY,
      ]);
      expect(captured.registered).toStrictEqual(RECOVERY_SECRET);
      expect(captured.migrated).toStrictEqual(RECOVERY_SECRET);
      expect(mockLinkSocialLogin).not.toHaveBeenCalled();
    });

    it("registers only the social identifier for the seedless login's issuer", async () => {
      const { service, controller } = createSetUpService({
        authIdentifiers: [AUTH_APPLE, AUTH_SOCIAL],
      });

      await service.setUp();

      expect(controller.register).toHaveBeenCalledWith(expect.any(Uint8Array), [
        SIWE,
        AUTH_SOCIAL,
      ]);
    });

    it('verifies once when the caller already verified', async () => {
      const { service, verifyMfa } = createSetUpService();

      const { passkeyIdentifier } = await service.prepareRun();
      await service.setUp([passkeyIdentifier]);

      expect(verifyMfa).toHaveBeenCalledTimes(1);
    });

    it('links the social login when Auth lists none, then reads the identifiers again', async () => {
      const { service, controller, seedless, auth, requestMfaApproval } =
        createSetUpService({ authIdentifiers: [AUTH_PASSKEY] });
      mockLinkSocialLogin.mockImplementation(async () => {
        auth.identifiers = [AUTH_PASSKEY, AUTH_SOCIAL];
      });

      await service.setUp([AUTH_PASSKEY]);

      expect(mockLinkSocialLogin).toHaveBeenCalledTimes(1);
      const [dependencies] = mockLinkSocialLogin.mock.calls[0];
      expect(dependencies).toStrictEqual({
        env: AUTH_ENV,
        seedlessState: seedless.state,
        getSocialAccessToken: expect.any(Function),
        getVerifiedAccessToken: expect.any(Function),
      });
      await expect(dependencies.getSocialAccessToken()).resolves.toBe(
        'social-token',
      );
      expect(dependencies.getVerifiedAccessToken()).toBe('verified-token');
      expect(
        requestMfaApproval.mock.calls.filter(
          ([request]) => request.includeIdentifiers,
        ),
      ).toHaveLength(2);
      expect(controller.register).toHaveBeenCalledWith(expect.any(Uint8Array), [
        SIWE,
        AUTH_SOCIAL,
        AUTH_PASSKEY,
      ]);
    });

    it('throws social_identifier_not_approved when linking does not add it', async () => {
      const { service, controller, seedless } = createSetUpService({
        authIdentifiers: [AUTH_PASSKEY],
      });
      mockLinkSocialLogin.mockResolvedValue(undefined);

      await expect(service.setUp()).rejects.toMatchObject({
        code: 'social_identifier_not_approved',
      });
      expect(controller.abort).not.toHaveBeenCalled();
      expect(controller.register).not.toHaveBeenCalled();
      expect(seedless.migrateToEnvelope).not.toHaveBeenCalled();
    });

    it('does not register when linking the social login fails', async () => {
      const { service, controller } = createSetUpService({
        authIdentifiers: [AUTH_PASSKEY],
      });
      const error = new Error('link failed');
      mockLinkSocialLogin.mockRejectedValue(error);

      await expect(service.setUp()).rejects.toBe(error);
      expect(controller.register).not.toHaveBeenCalled();
    });

    it('aborts, registers, authenticates, migrates data types, then seals the vault', async () => {
      const order: string[] = [];
      const { service, controller, seedless } = createSetUpService();
      controller.abort.mockImplementation(async () => {
        order.push('abort');
      });
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
        'abort',
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

    it('reuses the registered secret, read with the given passkey, when the escrow already has one', async () => {
      const controller = createController({ epoch: 2 });
      const seedless = createSeedless();
      const captured = captureSecrets(controller, seedless);
      const { service } = createService({ controller, seedless });

      await expect(service.setUp([PASSKEY])).resolves.toBe('enabled');

      expect(controller.register).not.toHaveBeenCalled();
      expect(controller.authenticateIdentifier).toHaveBeenCalledWith(
        PROVABLE_PASSKEY,
      );
      expect(captured.migrated).toStrictEqual(REGISTERED_SECRET);
      expect(controller.readSecrets[0]).toStrictEqual(new Uint8Array(32));
    });

    it('throws passkey_not_enrolled when the escrow has a secret and no passkey is given', async () => {
      const controller = createController({ epoch: 2 });
      const { service, seedless } = createService({ controller });

      await expect(service.setUp()).rejects.toMatchObject({
        code: 'passkey_not_enrolled',
      });
      expect(controller.register).not.toHaveBeenCalled();
      expect(seedless.migrateToEnvelope).not.toHaveBeenCalled();
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

  describe('getCandidateIdentifiers', () => {
    it("prefers Auth's identifiers and falls back to the account and seedless login", async () => {
      const controller = createController();
      const { service } = createService({ controller });

      expect(await service.getCandidateIdentifiers()).toStrictEqual({
        siwe: SIWE,
        passkey: AUTH_PASSKEY,
        social: SOCIAL,
      });
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

    it('rejects an identifier whose type is already enrolled', async () => {
      const controller = createController({ identifiers: [SIWE, PASSKEY] });
      const { service } = createService({ controller });

      await expect(
        service.addIdentifier({ ...AUTH_PASSKEY, value: 'other-credential' }),
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
});

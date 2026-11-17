import type {
  Identifier,
  MfaRecoveryController,
} from '@metamask/mfa-recovery-controller';
import { MfaRecoveryService } from '../../../../../core/Engine/controllers/mfa-recovery-controller/services/mfa-recovery-service';
import { createMfaRecoveryServiceTestMessenger } from '../../../../../core/Engine/controllers/mfa-recovery-controller/services/mfa-recovery-service-test-messenger';
import {
  getMfaRecoveryErrorDetail,
  runMfaRecoveryCubistRecover,
  runMfaRecoveryCubistTest,
} from './runMfaRecoveryCubistTest';

const mockEngineContext: Record<string, unknown> = {};

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    get context() {
      return mockEngineContext;
    },
  },
}));

jest.mock(
  '../../../../../core/Engine/controllers/mfa-recovery-controller/config',
  () => ({
    getCubistConfig: () => ({ authAudience: 'cubist-auth-audience' }),
    getToprfRecoveryConfig: () => ({ aal2Audience: 'toprf-aal2-audience' }),
  }),
);

const AUTH_SIWE: Identifier = {
  type: 'siwe',
  namespace: 'metamask.io:1',
  value: '0xabc',
  verifier: { domain: 'metamask.io', chainId: 1 },
} as Identifier;
const AUTH_PASSKEY: Identifier = {
  type: 'passkey',
  namespace: 'authentication.dev-api.cx.metamask.io',
  value: 'auth-cred',
  verifier: {
    rpId: 'authentication.dev-api.cx.metamask.io',
    credentialId: 'auth-cred',
  },
} as Identifier;
const SOCIAL: Identifier = {
  type: 'social',
  namespace: 'https://accounts.google.com',
  value: 'google-user',
};
const ORIGINAL_SECRET = new Uint8Array(32).fill(42);

interface MockControllerOptions {
  /** Identifier types Cubist reports; `'reject'` makes getIdentifiers throw. */
  enrolled: readonly { type: string }[] | 'reject';
}

/** A controller with a secret already registered in Cubist at epoch 1. */
function createRegisteredController({ enrolled }: MockControllerOptions) {
  let recoverySecret = new Uint8Array(ORIGINAL_SECRET);
  let recoveryEpoch = 1;
  return {
    getPhase: jest.fn().mockResolvedValue('idle'),
    resume: jest.fn(),
    getIdentifiers: jest.fn().mockImplementation(async () => {
      if (enrolled === 'reject') {
        throw new Error('read failed');
      }
      return {
        identifiers: enrolled.map((identifier) => ({
          ...identifier,
          namespace: 'metamask.io:1',
          value: 'enrolled',
        })),
        epoch: recoveryEpoch,
        authIdentifiers: [],
      };
    }),
    authenticateIdentifier: jest.fn().mockResolvedValue('identifier-session'),
    getRecoverySecret: jest.fn().mockImplementation(async () => ({
      recoverySecret: new Uint8Array(recoverySecret),
      epoch: recoveryEpoch,
    })),
    register: jest.fn(),
    updateRecoverySecret: jest
      .fn()
      .mockImplementation(async (_identifier, secret: Uint8Array) => {
        recoverySecret = new Uint8Array(secret);
        recoveryEpoch += 1;
      }),
  } as unknown as MfaRecoveryController;
}

function createService(controller: MfaRecoveryController, address = '0xabc') {
  const verifyMfa = jest.fn().mockResolvedValue(undefined);
  Object.assign(mockEngineContext, {
    MfaRecoveryController: controller,
    SeedlessOnboardingController: { state: {} },
    KeyringController: { state: { keyrings: [{ accounts: [address] }] } },
    AuthenticationController: {
      requestMfaApproval: jest.fn().mockResolvedValue({
        approval: 'approval',
        identifiers: [AUTH_SIWE, AUTH_PASSKEY],
      }),
    },
  });
  const service = new MfaRecoveryService({
    messenger: createMfaRecoveryServiceTestMessenger(() => mockEngineContext),
    verifyMfa,
    approvalOperation: 'test',
  });
  return { service, verifyMfa };
}

describe('runMfaRecoveryCubistTest', () => {
  it('tests an existing SIWE registration without registering a new one', async () => {
    const controller = createRegisteredController({
      enrolled: [{ type: 'siwe' }, { type: 'passkey' }],
    });
    const { service, verifyMfa } = createService(controller);
    const steps: string[] = [];

    const result = await runMfaRecoveryCubistTest(service, (step) => {
      steps.push(step);
    });

    expect(result).toEqual({ epoch: 3, matches: true });
    expect(controller.register).not.toHaveBeenCalled();
    expect(controller.authenticateIdentifier).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'siwe', value: AUTH_SIWE.value }),
    );
    expect(controller.updateRecoverySecret).toHaveBeenCalledTimes(2);
    expect(controller.updateRecoverySecret).toHaveBeenLastCalledWith(
      expect.anything(),
      ORIGINAL_SECRET,
      2,
    );
    expect(steps).toStrictEqual([
      'updating_recovery_secret',
      'restoring_recovery_secret',
      'completed',
    ]);
    expect(verifyMfa).toHaveBeenCalledTimes(1);
  });

  it('falls back to the Auth-approved passkey when Cubist has no SIWE identifier', async () => {
    const controller = createRegisteredController({
      enrolled: [{ type: 'passkey' }, { type: 'social' }],
    });

    await runMfaRecoveryCubistTest(createService(controller).service);

    expect(controller.authenticateIdentifier).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'passkey', value: AUTH_PASSKEY.value }),
    );
    expect(controller.register).not.toHaveBeenCalled();
  });

  it.each([
    ['an empty identifier list', { enrolled: [] as { type: string }[] }],
    ['a failed getIdentifiers read', { enrolled: 'reject' as const }],
  ])(
    'throws recovery_not_registered for %s without registering',
    async (_label, options) => {
      const controller = createRegisteredController(options);

      await expect(
        runMfaRecoveryCubistTest(createService(controller).service),
      ).rejects.toMatchObject({ code: 'recovery_not_registered' });
      expect(controller.register).not.toHaveBeenCalled();
      expect(controller.updateRecoverySecret).not.toHaveBeenCalled();
    },
  );
});

describe('runMfaRecoveryCubistRecover', () => {
  it('compares the read secret with the one the last test run restored', async () => {
    const controller = createRegisteredController({
      enrolled: [{ type: 'siwe' }],
    });
    const { service } = createService(controller);
    await runMfaRecoveryCubistTest(service);

    const result = await runMfaRecoveryCubistRecover(service);

    expect(result).toEqual({
      epoch: 3,
      matches: true,
      fingerprint: expect.stringMatching(/^[0-9a-f]{8}$/u),
    });
  });

  it('has nothing to compare with after the primary account changes', async () => {
    const controller = createRegisteredController({
      enrolled: [{ type: 'siwe' }],
    });

    const result = await runMfaRecoveryCubistRecover(
      createService(controller, '0xother').service,
    );

    expect(result.matches).toBeUndefined();
  });

  it.each([
    ['siwe', AUTH_SIWE],
    ['passkey', AUTH_PASSKEY],
  ] as const)(
    'reads the secret with the %s identifier Auth approved',
    async (identifierType, expected) => {
      const controller = createRegisteredController({
        enrolled: [{ type: 'siwe' }],
      });
      const onStep = jest.fn();

      await runMfaRecoveryCubistRecover(
        createService(controller).service,
        onStep,
        identifierType,
      );

      expect(controller.authenticateIdentifier).toHaveBeenCalledWith(
        expect.objectContaining({
          type: identifierType,
          value: expected.value,
        }),
      );
      expect(onStep).toHaveBeenCalledWith('completed');
    },
  );

  it('reads the secret with the given social identifier', async () => {
    const controller = createRegisteredController({
      enrolled: [{ type: 'social' }],
    });

    await runMfaRecoveryCubistRecover(
      createService(controller).service,
      undefined,
      'social',
      SOCIAL,
    );

    expect(controller.authenticateIdentifier).toHaveBeenCalledWith(SOCIAL);
  });

  it('throws social_login_unavailable without a social identifier', async () => {
    const controller = createRegisteredController({
      enrolled: [{ type: 'social' }],
    });

    await expect(
      runMfaRecoveryCubistRecover(
        createService(controller).service,
        undefined,
        'social',
      ),
    ).rejects.toMatchObject({ code: 'social_login_unavailable' });
    expect(controller.authenticateIdentifier).not.toHaveBeenCalled();
  });
});

describe('getMfaRecoveryErrorDetail', () => {
  it('joins the message and HTTP details', () => {
    const error = Object.assign(new Error('escrow failed'), {
      statusText: 'Forbidden',
      errorCode: 'E403',
      requestId: 'req-1',
      url: 'https://escrow.example/mutate',
    });

    expect(getMfaRecoveryErrorDetail(error)).toBe(
      'escrow failed | Forbidden | errorCode=E403 | requestId=req-1 | https://escrow.example/mutate',
    );
  });

  it('redacts emails and token-like strings', () => {
    const error = new Error(
      'rejected user@example.com with eyJhbGciOiJIUzI1NiJ9abcdefghijkl',
    );

    expect(getMfaRecoveryErrorDetail(error)).toBe(
      'rejected <email> with <redacted>',
    );
  });

  it.each([
    ['a non-object', 'failed'],
    ['an error without details', new Error('  ')],
  ])('returns undefined for %s', (_label, error) => {
    expect(getMfaRecoveryErrorDetail(error)).toBeUndefined();
  });
});

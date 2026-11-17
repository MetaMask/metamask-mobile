import type {
  Identifier,
  MfaRecoveryController,
} from '@metamask/mfa-recovery-controller';
import { RecoveryIdentifierRouter } from '../../../../../core/Engine/controllers/mfa-recovery-controller/auth/identifier-auth-provider';
import { createSiweIdentifier } from '../../../../../core/Engine/controllers/mfa-recovery-controller/auth/identifiers';
import { MfaRecoveryService } from '../../../../../core/Engine/controllers/mfa-recovery-controller/services/mfa-recovery-service';
import { runMfaRecoveryCubistTest } from './runMfaRecoveryCubistTest';

const mockEngineContext: Record<string, unknown> = {};

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    get context() {
      return mockEngineContext;
    },
  },
}));

const PROOF_PUBLIC_KEY = new Uint8Array(32).fill(7);
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

interface MockControllerOptions {
  /** Identifier types Cubist reports; `'reject'` makes getIdentifiers throw. */
  enrolled: readonly { type: string }[] | 'reject';
}

/** A controller with a secret already registered in Cubist at epoch 1. */
function createRegisteredController({ enrolled }: MockControllerOptions) {
  let recoverySecret = new Uint8Array(32).fill(42);
  let recoveryEpoch = 1;
  const controller = {
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
  return controller;
}

function createService(controller: MfaRecoveryController) {
  const verifyMfa = jest.fn().mockResolvedValue(undefined);
  Object.assign(mockEngineContext, {
    MfaRecoveryController: controller,
    SeedlessOnboardingController: {},
    KeyringController: { state: { keyrings: [{ accounts: ['0xabc'] }] } },
    AuthenticationController: {
      requestMfaApproval: jest.fn().mockResolvedValue({
        approval: 'approval',
        identifiers: [AUTH_SIWE, AUTH_PASSKEY],
      }),
    },
  });
  const service = new MfaRecoveryService({
    verifyMfa,
    approvalOperation: 'test',
  });
  return { service, verifyMfa };
}

function createRouter() {
  const signPersonalMessage = jest.fn().mockResolvedValue('0xsignature');
  const identifierRouter = new RecoveryIdentifierRouter({
    getAddress: () => '0xabc',
    signPersonalMessage,
  });
  return { identifierRouter, signPersonalMessage };
}

describe('runMfaRecoveryCubistTest', () => {
  it('tests an existing SIWE registration without registering a new one', async () => {
    const { identifierRouter, signPersonalMessage } = createRouter();
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
      new Uint8Array(32).fill(42),
      2,
    );
    expect(steps[0]).toBe('updating_recovery_secret');
    expect(steps).toContain('restoring_recovery_secret');
    expect(steps).toContain('completed');
    expect(verifyMfa).toHaveBeenCalledTimes(1);

    const siweIdentifier = createSiweIdentifier('0xabc');
    await expect(
      identifierRouter.getKeyBoundIdentifierToken({
        identifier: siweIdentifier,
        proofPublicKey: PROOF_PUBLIC_KEY,
        requestHash: '0xrequest',
      }),
    ).resolves.toEqual(expect.objectContaining({ identifier: siweIdentifier }));
    expect(signPersonalMessage).toHaveBeenCalled();
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

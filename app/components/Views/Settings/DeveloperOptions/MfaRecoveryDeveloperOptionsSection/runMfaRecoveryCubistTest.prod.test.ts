import type {
  Identifier,
  MfaRecoveryController,
} from '@metamask/mfa-recovery-controller';
import { RecoveryIdentifierRouter } from '../../../../../core/Engine/controllers/mfa-recovery-controller/auth/identifier-auth-provider';
import { createSiweIdentifier } from '../../../../../core/Engine/controllers/mfa-recovery-controller/auth/identifiers';
import {
  runMfaRecoveryCubistTest,
  type MfaRecoveryTestDependencies,
} from './runMfaRecoveryCubistTest';

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

describe('runMfaRecoveryCubistTest', () => {
  it('runs the shared flow with the Engine controller and the Auth-approved passkey', async () => {
    const signPersonalMessage = jest.fn().mockResolvedValue('0xsignature');
    const identifierRouter = new RecoveryIdentifierRouter({
      getAddress: () => '0xabc',
      signPersonalMessage,
    });
    let recoverySecret = Uint8Array.from([1, 2, 3]);
    let recoveryEpoch = 1;
    let isRegistered = false;
    const controller = {
      getPhase: jest.fn().mockResolvedValue('idle'),
      resume: jest.fn(),
      authenticateIdentifier: jest.fn().mockResolvedValue('identifier-session'),
      getRecoverySecret: jest.fn().mockImplementation(async () => {
        if (!isRegistered) {
          throw new Error('identifier is not registered');
        }
        return {
          recoverySecret: new Uint8Array(recoverySecret),
          epoch: recoveryEpoch,
        };
      }),
      register: jest
        .fn()
        .mockImplementation(
          async (secret: Uint8Array, _identifiers: Identifier[]) => {
            recoverySecret = new Uint8Array(secret);
            recoveryEpoch = 1;
            isRegistered = true;
          },
        ),
      updateRecoverySecret: jest
        .fn()
        .mockImplementation(async (_identifier, secret: Uint8Array) => {
          recoverySecret = new Uint8Array(secret);
          recoveryEpoch += 1;
        }),
    } as unknown as MfaRecoveryController;
    const dependencies: MfaRecoveryTestDependencies = {
      controller,
      identifierRouter,
      address: '0xabc',
      randomBytes: jest
        .fn()
        .mockImplementationOnce((length: number) =>
          new Uint8Array(length).fill(42),
        )
        .mockImplementationOnce((length: number) =>
          new Uint8Array(length).fill(43),
        ),
      verifyMfa: jest.fn().mockResolvedValue(undefined),
      getAuthIdentifiers: jest
        .fn()
        .mockResolvedValue([AUTH_SIWE, AUTH_PASSKEY]),
    };
    const steps: string[] = [];

    const result = await runMfaRecoveryCubistTest(dependencies, (step) => {
      steps.push(step);
    });

    expect(result).toEqual({ epoch: 3, matches: true });
    expect(controller.updateRecoverySecret).toHaveBeenCalledTimes(2);
    expect(controller.updateRecoverySecret).toHaveBeenLastCalledWith(
      expect.anything(),
      new Uint8Array(32).fill(42),
      2,
    );
    expect(steps).toContain('restoring_recovery_secret');
    expect(controller.register).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      expect.arrayContaining([
        expect.objectContaining({ type: 'siwe', value: AUTH_SIWE.value }),
        expect.objectContaining({ type: 'passkey', value: AUTH_PASSKEY.value }),
      ]),
    );
    expect(dependencies.verifyMfa).toHaveBeenCalledTimes(1);
    expect(steps[0]).toBe('verifying_mfa');
    expect(steps).toContain('completed');
    expect(dependencies.randomBytes).toHaveBeenCalledWith(32);

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
});

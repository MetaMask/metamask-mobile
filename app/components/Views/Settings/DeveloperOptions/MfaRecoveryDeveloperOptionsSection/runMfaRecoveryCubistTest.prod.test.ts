import type {
  Identifier,
  MfaRecoveryController,
} from '@metamask/mfa-recovery-controller';
import { RecoveryIdentifierRouter } from '../../../../../core/Engine/controllers/mfa-recovery-controller/identifier-auth-provider';
import { createSiweIdentifier } from '../../../../../core/Engine/controllers/mfa-recovery-controller/identifiers';
import {
  runMfaRecoveryCubistTest,
  type MfaRecoveryTestDependencies,
} from './runMfaRecoveryCubistTest';

describe('runMfaRecoveryCubistTest', () => {
  it('runs the shared flow with the Engine controller and registered passkey provider', async () => {
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
      updateIdentifiers: jest.fn().mockImplementation(async () => {
        recoveryEpoch += 1;
      }),
    } as unknown as MfaRecoveryController;
    const dependencies: MfaRecoveryTestDependencies = {
      controller,
      identifierRouter,
      address: '0xabc',
      randomBytes: jest.fn((length: number) => new Uint8Array(length).fill(42)),
    };
    const steps: string[] = [];

    const result = await runMfaRecoveryCubistTest(dependencies, (step) => {
      steps.push(step);
    });

    expect(result).toEqual({ epoch: 3, matches: true });
    expect(controller.register).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      expect.arrayContaining([
        expect.objectContaining({ type: 'siwe' }),
        expect.objectContaining({ type: 'passkey' }),
      ]),
    );
    expect(controller.updateIdentifiers).toHaveBeenCalled();
    expect(steps).toContain('completed');
    expect(dependencies.randomBytes).toHaveBeenCalledWith(32);

    const siweIdentifier = createSiweIdentifier('0xabc');
    await expect(
      identifierRouter.getKeyBoundIdentifierToken({
        identifier: siweIdentifier,
        proofPublicKey: '{"kty":"EC"}',
        requestHash: '0xrequest',
      }),
    ).resolves.toEqual(expect.objectContaining({ identifier: siweIdentifier }));
    expect(signPersonalMessage).toHaveBeenCalled();
  });
});

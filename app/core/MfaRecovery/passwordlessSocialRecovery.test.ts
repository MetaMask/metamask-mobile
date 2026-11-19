import type { Identifier } from '@metamask/mfa-recovery-controller';
import {
  SecretMetadata,
  SecretType,
} from '@metamask/seedless-onboarding-controller';
import { RECOVERY_SECRET_LENGTH } from '../Engine/controllers/mfa-recovery-controller/constants';
import type { MfaRecoveryService } from './services/mfa-recovery-service';
import {
  PasswordlessRecoveryError,
  recoverWithLocalPassword,
} from './passwordlessSocialRecovery';

const PASSKEY: Identifier = {
  type: 'passkey',
  namespace: 'metamask.io',
  value: 'cred-1',
  verifier: { rpId: 'metamask.io', credentialId: 'cred-1' },
};

const LOCAL_PASSWORD = 'local-password-1234';

function createService() {
  const calls: string[] = [];
  const secrets: {
    read?: Uint8Array;
    seen?: Uint8Array;
    recovered?: SecretMetadata[];
  } = {};
  return {
    calls,
    secrets,
    readRecoverySecret: jest.fn(async (_identifier: Identifier) => {
      calls.push('readRecoverySecret');
      const recoverySecret = new Uint8Array(RECOVERY_SECRET_LENGTH).fill(9);
      secrets.read = recoverySecret;
      return { epoch: 1, recoverySecret };
    }),
    openRecoverySession: jest.fn(async () => {
      calls.push('openRecoverySession');
    }),
    recoverWithRecoverySecret: jest.fn(async (recoverySecret: Uint8Array) => {
      calls.push('recoverWithRecoverySecret');
      secrets.seen = new Uint8Array(recoverySecret);
      secrets.recovered = [
        new SecretMetadata(new Uint8Array([1, 2, 3]), {
          type: SecretType.Mnemonic,
        }),
        new SecretMetadata(new Uint8Array([4, 5, 6]), {
          type: SecretType.PrivateKey,
        }),
      ];
      return secrets.recovered;
    }),
    setLocalPassword: jest.fn(async (_password: string) => {
      calls.push('setLocalPassword');
    }),
    resetGlobalPassword: jest.fn(async (_newPassword: string) => {
      calls.push('resetGlobalPassword');
    }),
  };
}

const asService = (
  fake: ReturnType<typeof createService>,
): MfaRecoveryService => fake as unknown as MfaRecoveryService;

const recover = (fake: ReturnType<typeof createService>) =>
  recoverWithLocalPassword(asService(fake), {
    identifier: PASSKEY,
    localPassword: LOCAL_PASSWORD,
  });

const zeroedSecret = () => new Uint8Array(RECOVERY_SECRET_LENGTH).fill(0);

describe('recoverWithLocalPassword', () => {
  it('recovers with the Recovery Secret, then sets the local password', async () => {
    const fake = createService();

    await expect(recover(fake)).resolves.toBeUndefined();

    expect(fake.readRecoverySecret).toHaveBeenCalledWith(PASSKEY);
    expect(fake.secrets.seen).toStrictEqual(
      new Uint8Array(RECOVERY_SECRET_LENGTH).fill(9),
    );
    expect(fake.setLocalPassword).toHaveBeenCalledWith(LOCAL_PASSWORD);
    expect(fake.calls).toStrictEqual([
      'readRecoverySecret',
      'openRecoverySession',
      'recoverWithRecoverySecret',
      'setLocalPassword',
    ]);
    expect(fake.resetGlobalPassword).not.toHaveBeenCalled();
  });

  it('reads the Recovery Secret and opens the session in parallel', async () => {
    const fake = createService();
    let releaseRead: () => void = () => undefined;
    fake.readRecoverySecret.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseRead = () =>
            resolve({
              epoch: 1,
              recoverySecret: new Uint8Array(RECOVERY_SECRET_LENGTH).fill(9),
            });
        }),
    );

    const result = recover(fake);
    await Promise.resolve();

    expect(fake.openRecoverySession).toHaveBeenCalledTimes(1);
    expect(fake.recoverWithRecoverySecret).not.toHaveBeenCalled();
    releaseRead();
    await result;
    expect(fake.recoverWithRecoverySecret).toHaveBeenCalledTimes(1);
  });

  it('zeroes the Recovery Secret and the recovered secrets on success', async () => {
    const fake = createService();

    await recover(fake);

    expect(fake.secrets.read).toStrictEqual(zeroedSecret());
    expect(fake.secrets.recovered?.map((secret) => secret.data)).toStrictEqual([
      new Uint8Array(3),
      new Uint8Array(3),
    ]);
  });

  it('reports recovering_secrets at reading_secret when the escrow read fails', async () => {
    const fake = createService();
    fake.readRecoverySecret.mockRejectedValue(
      Object.assign(new Error('read failed'), { code: 'read_failed' }),
    );

    const error = await recover(fake).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(PasswordlessRecoveryError);
    expect(error).toMatchObject({
      stage: 'recovering_secrets',
      code: 'read_failed',
      detail: 'reading_secret; Error: read failed',
    });
    expect(fake.recoverWithRecoverySecret).not.toHaveBeenCalled();
    expect(fake.setLocalPassword).not.toHaveBeenCalled();
  });

  it('reports opening_session and zeroes the secret when the session fails', async () => {
    const fake = createService();
    fake.openRecoverySession.mockRejectedValue(new Error('session failed'));

    const error = await recover(fake).catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      stage: 'recovering_secrets',
      detail: 'opening_session; Error: session failed',
    });
    expect(fake.recoverWithRecoverySecret).not.toHaveBeenCalled();
    expect(fake.secrets.read).toStrictEqual(zeroedSecret());
  });

  it('reports recovering_vault and zeroes the secret when the TOPRF recovery fails', async () => {
    const fake = createService();
    fake.recoverWithRecoverySecret.mockRejectedValue(
      new Error('recover failed'),
    );

    const error = await recover(fake).catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      stage: 'recovering_secrets',
      detail: 'recovering_vault; Error: recover failed',
    });
    expect(fake.secrets.read).toStrictEqual(zeroedSecret());
    expect(fake.setLocalPassword).not.toHaveBeenCalled();
  });

  it('reports setting_password at setting_local_password and still zeroes the recovered secrets', async () => {
    const fake = createService();
    fake.setLocalPassword.mockRejectedValue(new Error('password rejected'));

    const error = await recover(fake).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(PasswordlessRecoveryError);
    expect(error).toMatchObject({
      stage: 'setting_password',
      detail: 'setting_local_password; Error: password rejected',
    });
    expect((error as PasswordlessRecoveryError).detail).not.toContain(
      LOCAL_PASSWORD,
    );
    expect(fake.secrets.read).toStrictEqual(zeroedSecret());
    expect(fake.secrets.recovered?.map((secret) => secret.data)).toStrictEqual([
      new Uint8Array(3),
      new Uint8Array(3),
    ]);
    expect(fake.resetGlobalPassword).not.toHaveBeenCalled();
  });
});

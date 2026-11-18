import type { Identifier } from '@metamask/mfa-recovery-controller';
import { AuthConnection } from '@metamask/seedless-onboarding-controller';
import { bytesToHex, sha256 } from '@metamask/utils';
import { RECOVERY_SECRET_LENGTH } from '../Engine/controllers/mfa-recovery-controller/constants';
import { LinkSocialLoginError } from './linkSocialLogin';
import {
  PasswordlessRecoverySetupError,
  setupPasswordlessRecovery,
  type PasswordlessRecoverySetupDependencies,
} from './setupPasswordlessRecovery';

const PASSKEY: Identifier = {
  type: 'passkey',
  namespace: 'metamask.io',
  value: 'cred-1',
};

const SOCIAL: Identifier = {
  type: 'social',
  namespace: 'https://accounts.google.com',
  value: 'google-user',
  verifier: { issuer: 'https://accounts.google.com' },
};

const hashOf = async (secret: Uint8Array) => bytesToHex(await sha256(secret));

const TOPRF = {
  aal2Audience: 'dev-node.web3auth.io',
  authConnectionId: 'mm-recovery-dev-aal2-common',
  groupedAuthConnectionId: 'mm-recovery-aal2-dev',
};

function createDependencies(
  state: PasswordlessRecoverySetupDependencies['seedless']['state'] = {
    authConnection: AuthConnection.Google,
    userId: 'google-user',
    socialLoginEmail: 'user@example.com',
  },
): PasswordlessRecoverySetupDependencies & { seenSecret?: Uint8Array } {
  let savedHash: string | null = null;
  const record: PasswordlessRecoverySetupDependencies & {
    seenSecret?: Uint8Array;
  } = {
    mfaRecovery: {
      trustIdentifier: jest.fn(async () => undefined),
      register: jest.fn(async () => undefined),
      abort: jest.fn(async () => undefined),
      getIdentifiers: jest.fn(async () => ({
        identifiers: [],
        epoch: 0,
        authIdentifiers: [],
      })),
      authenticateIdentifier: jest.fn(),
      getRecoverySecret: jest.fn(),
    },
    seedless: {
      state,
      authenticateForRecovery: jest.fn(async () => undefined),
      runMigrations: jest.fn(async () => true),
      migrateToEnvelope: jest.fn(async ({ recoverySecret }) => {
        record.seenSecret = new Uint8Array(recoverySecret);
      }),
    },
    requestMfaApproval: jest.fn(async () => ({
      approval: 'aal2-token',
      expiresIn: 60,
      identifiers: [PASSKEY, SOCIAL],
    })),
    verifyMfa: jest.fn(async () => undefined),
    linkSocialLogin: jest.fn(async () => undefined),
    toprf: TOPRF,
    cubistAuthAudience: 'gamma.signer.cubist.dev',
    randomBytes: (length) => new Uint8Array(length).fill(4),
    retryPendingPasskeys: jest.fn(async () => undefined),
    registeredSecretHash: {
      get: jest.fn(async () => savedHash),
      set: jest.fn(async (hash: string) => {
        savedHash = hash;
      }),
    },
  };
  return record;
}

describe('setupPasswordlessRecovery', () => {
  it('registers the passkey and social login, then seals the vault', async () => {
    const dependencies = createDependencies();

    const result = await setupPasswordlessRecovery(dependencies);

    expect(result).toBe('enabled');
    expect(dependencies.verifyMfa).toHaveBeenCalledTimes(1);
    expect(dependencies.retryPendingPasskeys).toHaveBeenCalledTimes(1);
    expect(dependencies.linkSocialLogin).not.toHaveBeenCalled();
    expect(dependencies.mfaRecovery.abort).toHaveBeenCalledTimes(1);
    expect(dependencies.mfaRecovery.trustIdentifier).toHaveBeenCalledWith({
      type: 'social',
      namespace: 'https://accounts.google.com',
      identity: 'user@example.com',
    });
    expect(dependencies.mfaRecovery.register).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      [PASSKEY, SOCIAL],
    );
    expect(dependencies.seedless.authenticateForRecovery).toHaveBeenCalledWith({
      aal2Token: 'aal2-token',
      authConnectionId: TOPRF.authConnectionId,
      groupedAuthConnectionId: TOPRF.groupedAuthConnectionId,
    });
    expect(dependencies.seedless.runMigrations).toHaveBeenCalledTimes(1);
    expect(dependencies.seenSecret).toStrictEqual(
      new Uint8Array(RECOVERY_SECRET_LENGTH).fill(4),
    );
  });

  it('records the Apple login by its sub', async () => {
    const dependencies = createDependencies({
      authConnection: AuthConnection.Apple,
      userId: 'apple-sub',
    });
    jest.mocked(dependencies.requestMfaApproval).mockResolvedValue({
      approval: 'aal2-token',
      expiresIn: 60,
      identifiers: [
        PASSKEY,
        { ...SOCIAL, namespace: 'https://appleid.apple.com' },
      ],
    });

    await setupPasswordlessRecovery(dependencies);

    expect(dependencies.mfaRecovery.trustIdentifier).toHaveBeenCalledWith({
      type: 'social',
      namespace: 'https://appleid.apple.com',
      identity: 'apple-sub',
    });
  });

  it('stops before registration when the social identity is unknown', async () => {
    const dependencies = createDependencies({
      authConnection: AuthConnection.Google,
      userId: 'google-user',
    });

    const error = await setupPasswordlessRecovery(dependencies).catch(
      (caught: unknown) => caught,
    );

    expect(error).toMatchObject({ code: 'social_identity_unknown' });
    expect(dependencies.mfaRecovery.register).not.toHaveBeenCalled();
  });

  it('does nothing when the vault is already sealed', async () => {
    const dependencies = createDependencies({
      authConnection: AuthConnection.Google,
      userId: 'google-user',
      envelope: { v: 1, vaultAuthPubKey: 'key', passwordAuthPubKey: 'key' },
    });

    const result = await setupPasswordlessRecovery(dependencies);

    expect(result).toBe('already_enabled');
    expect(dependencies.verifyMfa).not.toHaveBeenCalled();
    expect(dependencies.mfaRecovery.register).not.toHaveBeenCalled();
  });

  it('stops before registration when no passkey is approved', async () => {
    const dependencies = createDependencies();
    jest.mocked(dependencies.requestMfaApproval).mockResolvedValue({
      approval: 'aal2-token',
      expiresIn: 60,
      identifiers: [],
    });

    const error = await setupPasswordlessRecovery(dependencies).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(PasswordlessRecoverySetupError);
    expect(error).toMatchObject({ code: 'passkey_not_enrolled' });
    expect(dependencies.mfaRecovery.register).not.toHaveBeenCalled();
  });

  it('links the social login, then registers it once Auth approves it', async () => {
    const dependencies = createDependencies();
    jest
      .mocked(dependencies.requestMfaApproval)
      .mockResolvedValueOnce({
        approval: 'aal2-token',
        expiresIn: 60,
        identifiers: [PASSKEY],
      })
      .mockResolvedValue({
        approval: 'aal2-token',
        expiresIn: 60,
        identifiers: [PASSKEY, SOCIAL],
      });

    const result = await setupPasswordlessRecovery(dependencies);

    expect(result).toBe('enabled');
    expect(dependencies.linkSocialLogin).toHaveBeenCalledTimes(1);
    expect(dependencies.mfaRecovery.register).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      [PASSKEY, SOCIAL],
    );
  });

  it('stops before registration when Auth still omits the social login after linking', async () => {
    const dependencies = createDependencies();
    jest.mocked(dependencies.requestMfaApproval).mockResolvedValue({
      approval: 'aal2-token',
      expiresIn: 60,
      identifiers: [PASSKEY],
    });

    const error = await setupPasswordlessRecovery(dependencies).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(PasswordlessRecoverySetupError);
    expect(error).toMatchObject({
      code: 'social_identifier_not_approved',
      detail: 'passkey@metamask.io',
    });
    expect(dependencies.linkSocialLogin).toHaveBeenCalledTimes(1);
    expect(dependencies.mfaRecovery.register).not.toHaveBeenCalled();
  });

  it('stops before registration when linking the social login fails', async () => {
    const dependencies = createDependencies();
    jest.mocked(dependencies.requestMfaApproval).mockResolvedValue({
      approval: 'aal2-token',
      expiresIn: 60,
      identifiers: [PASSKEY],
    });
    jest.mocked(dependencies.linkSocialLogin).mockRejectedValue(
      Object.assign(new Error('link failed'), {
        code: 'social_linked_to_other_profile',
      }),
    );

    const error = await setupPasswordlessRecovery(dependencies).catch(
      (caught: unknown) => caught,
    );

    expect(error).toMatchObject({ code: 'social_linked_to_other_profile' });
    expect(dependencies.mfaRecovery.register).not.toHaveBeenCalled();
  });

  it('keeps the reason Auth gave when linking the social login fails', async () => {
    const dependencies = createDependencies();
    jest.mocked(dependencies.requestMfaApproval).mockResolvedValue({
      approval: 'aal2-token',
      expiresIn: 60,
      identifiers: [PASSKEY],
    });
    jest
      .mocked(dependencies.linkSocialLogin)
      .mockRejectedValue(
        new LinkSocialLoginError('social_link_http_400', 'bad email'),
      );

    const error = await setupPasswordlessRecovery(dependencies).catch(
      (caught: unknown) => caught,
    );

    expect(error).toMatchObject({
      code: 'social_link_http_400',
      detail: 'bad email',
    });
  });

  it('saves the hash of the secret before registering it', async () => {
    const dependencies = createDependencies();
    jest
      .mocked(dependencies.mfaRecovery.register)
      .mockImplementation(async () => {
        expect(await dependencies.registeredSecretHash.get()).toBe(
          await hashOf(new Uint8Array(RECOVERY_SECRET_LENGTH).fill(4)),
        );
      });

    await setupPasswordlessRecovery(dependencies);

    expect(dependencies.mfaRecovery.register).toHaveBeenCalledTimes(1);
  });

  it('refuses a registered secret this device did not generate', async () => {
    const dependencies = createDependencies();
    await dependencies.registeredSecretHash.set(
      await hashOf(new Uint8Array(RECOVERY_SECRET_LENGTH).fill(9)),
    );
    jest.mocked(dependencies.mfaRecovery.getIdentifiers).mockResolvedValue({
      identifiers: [PASSKEY, SOCIAL],
      epoch: 1,
      authIdentifiers: [],
    });
    jest
      .mocked(dependencies.mfaRecovery.authenticateIdentifier)
      .mockResolvedValue({ session: 'auth' } as never);
    jest.mocked(dependencies.mfaRecovery.getRecoverySecret).mockResolvedValue({
      recoverySecret: new Uint8Array(RECOVERY_SECRET_LENGTH).fill(7),
    } as never);

    const error = await setupPasswordlessRecovery(dependencies).catch(
      (caught: unknown) => caught,
    );

    expect(error).toMatchObject({ code: 'recovery_registered_elsewhere' });
    expect(dependencies.seedless.migrateToEnvelope).not.toHaveBeenCalled();
  });

  it('reuses a previously registered recovery secret when the escrow epoch is set', async () => {
    const dependencies = createDependencies();
    const registeredSecret = new Uint8Array(RECOVERY_SECRET_LENGTH).fill(9);
    await dependencies.registeredSecretHash.set(await hashOf(registeredSecret));
    jest.mocked(dependencies.mfaRecovery.getIdentifiers).mockResolvedValue({
      identifiers: [PASSKEY, SOCIAL],
      epoch: 1,
      authIdentifiers: [],
    });
    jest
      .mocked(dependencies.mfaRecovery.authenticateIdentifier)
      .mockResolvedValue({ session: 'auth' } as never);
    jest.mocked(dependencies.mfaRecovery.getRecoverySecret).mockResolvedValue({
      recoverySecret: registeredSecret,
    } as never);

    const result = await setupPasswordlessRecovery(dependencies);

    expect(result).toBe('enabled');
    expect(dependencies.mfaRecovery.register).not.toHaveBeenCalled();
    expect(
      dependencies.mfaRecovery.authenticateIdentifier,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'passkey',
        verifier: { rpId: 'metamask.io', credentialId: 'cred-1' },
      }),
    );
    expect(dependencies.seenSecret).toStrictEqual(
      new Uint8Array(RECOVERY_SECRET_LENGTH).fill(9),
    );
  });

  it('rejects a registered secret whose length is wrong', async () => {
    const dependencies = createDependencies();
    jest.mocked(dependencies.mfaRecovery.getIdentifiers).mockResolvedValue({
      identifiers: [PASSKEY, SOCIAL],
      epoch: 1,
      authIdentifiers: [],
    });
    jest
      .mocked(dependencies.mfaRecovery.authenticateIdentifier)
      .mockResolvedValue({ session: 'auth' } as never);
    jest.mocked(dependencies.mfaRecovery.getRecoverySecret).mockResolvedValue({
      recoverySecret: new Uint8Array(8).fill(1),
    } as never);

    const error = await setupPasswordlessRecovery(dependencies).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(PasswordlessRecoverySetupError);
    expect(error).toMatchObject({ code: 'recovery_secret_invalid' });
  });

  it('wraps unexpected errors with the failed stage detail', async () => {
    const dependencies = createDependencies();
    jest
      .mocked(dependencies.verifyMfa)
      .mockRejectedValue(
        Object.assign(new Error('verify blew up'), { code: 'verify_failed' }),
      );

    const error = await setupPasswordlessRecovery(dependencies).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(PasswordlessRecoverySetupError);
    expect(error).toMatchObject({
      code: 'verify_failed',
      detail: expect.stringContaining('verifying_mfa'),
    });
  });

  it('rethrows PasswordlessRecoverySetupError without wrapping', async () => {
    const dependencies = createDependencies();
    const setupError = new PasswordlessRecoverySetupError(
      'passkey_not_enrolled',
    );
    jest.mocked(dependencies.verifyMfa).mockRejectedValue(setupError);

    await expect(setupPasswordlessRecovery(dependencies)).rejects.toBe(
      setupError,
    );
  });

  it('wraps sealing failures with the sealing stage detail', async () => {
    const dependencies = createDependencies();
    jest
      .mocked(dependencies.seedless.migrateToEnvelope)
      .mockRejectedValue(new Error('seal failed'));

    const error = await setupPasswordlessRecovery(dependencies).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(PasswordlessRecoverySetupError);
    expect(error).toMatchObject({
      code: 'unknown_error',
      detail: expect.stringContaining('sealing_vault'),
    });
  });
});

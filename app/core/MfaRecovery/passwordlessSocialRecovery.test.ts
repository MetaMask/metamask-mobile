import type {
  Identifier,
  IdentifierSession,
} from '@metamask/mfa-recovery-controller';
import {
  SecretMetadata,
  SecretType,
} from '@metamask/seedless-onboarding-controller';
import { bytesToHex } from '@metamask/utils';
import { RECOVERY_SECRET_LENGTH } from '../Engine/controllers/mfa-recovery-controller/constants';
import {
  findRecoveryIdentifier,
  PasswordlessRecoveryError,
  recoverWalletWithoutPassword,
  type PasswordlessRecoveryDependencies,
} from './passwordlessSocialRecovery';

const PASSKEY: Identifier = {
  type: 'passkey',
  namespace: 'metamask.io',
  value: 'cred-1',
  verifier: { rpId: 'metamask.io', credentialId: 'cred-1' },
};

const SOCIAL: Identifier = {
  type: 'social',
  namespace: 'https://accounts.google.com',
  value: 'google-user',
};

const SESSION = {
  requestId: 'request-1',
} as IdentifierSession;

const TOPRF = {
  aal2Audience: 'dev-node.web3auth.io',
  authConnectionId: 'mm-recovery-dev-aal2-common',
  groupedAuthConnectionId: 'mm-recovery-aal2-dev',
};

const NEW_PASSWORD = 'new-password';

function recoveredSecrets(): SecretMetadata[] {
  return [
    new SecretMetadata(new Uint8Array([1, 2, 3]), {
      type: SecretType.Mnemonic,
    }),
  ];
}

function createDependencies(): PasswordlessRecoveryDependencies & {
  calls: string[];
  seenSecret: Uint8Array | undefined;
} {
  const calls: string[] = [];
  const record: PasswordlessRecoveryDependencies & {
    calls: string[];
    seenSecret: Uint8Array | undefined;
  } = {
    calls,
    seenSecret: undefined,
    mfaRecovery: {
      getIdentifiers: jest.fn(),
      authenticateIdentifier: jest.fn(async () => {
        calls.push('authenticateIdentifier');
        return SESSION;
      }),
      getRecoverySecret: jest.fn(async () => {
        calls.push('getRecoverySecret');
        return {
          recoverySecret: new Uint8Array(RECOVERY_SECRET_LENGTH).fill(9),
          epoch: 1,
        };
      }),
    },
    seedless: {
      authenticateForRecovery: jest.fn(async () => {
        calls.push('authenticateForRecovery');
      }),
      recoverWithRecoverySecret: jest.fn(async ({ recoverySecret }) => {
        calls.push('recoverWithRecoverySecret');
        record.seenSecret = new Uint8Array(recoverySecret);
        return recoveredSecrets();
      }),
      setLocalPassword: jest.fn(async () => {
        calls.push('setLocalPassword');
      }),
      resetPasswordWithVaultKeys: jest.fn(async () => {
        calls.push('resetPasswordWithVaultKeys');
      }),
    },
    requestMfaApproval: jest.fn(async () => {
      calls.push('requestMfaApproval');
      return { approval: 'aal2-token', expiresIn: 60 };
    }),
    toprf: TOPRF,
    randomBytes: (length) => new Uint8Array(length).fill(1),
  };
  return record;
}

describe('findRecoveryIdentifier', () => {
  it('returns the enrolled passkey ahead of the social login', async () => {
    const dependencies = createDependencies();
    jest.mocked(dependencies.mfaRecovery.getIdentifiers).mockResolvedValue({
      identifiers: [SOCIAL, PASSKEY],
      epoch: 1,
      authIdentifiers: [SOCIAL, PASSKEY],
    });

    const identifier = await findRecoveryIdentifier(dependencies, {
      canProveSocialIdentifier: true,
    });

    expect(identifier).toBe(PASSKEY);
  });

  it('fills the passkey verifier when Auth omitted it', async () => {
    const dependencies = createDependencies();
    const passkey = {
      type: 'passkey',
      namespace: 'metamask.io',
      value: 'cred-1',
    };
    jest.mocked(dependencies.mfaRecovery.getIdentifiers).mockResolvedValue({
      identifiers: [passkey],
      epoch: 1,
      authIdentifiers: [passkey],
    });

    const identifier = await findRecoveryIdentifier(dependencies, {
      canProveSocialIdentifier: false,
    });

    expect(identifier).toStrictEqual({
      ...passkey,
      verifier: { rpId: 'metamask.io', credentialId: 'cred-1' },
    });
  });

  it('returns the social login when no passkey is enrolled', async () => {
    const dependencies = createDependencies();
    jest.mocked(dependencies.mfaRecovery.getIdentifiers).mockResolvedValue({
      identifiers: [SOCIAL],
      epoch: 1,
      authIdentifiers: [SOCIAL],
    });

    const identifier = await findRecoveryIdentifier(dependencies, {
      canProveSocialIdentifier: true,
    });

    expect(identifier).toBe(SOCIAL);
  });

  it('returns null when the social login cannot be proven', async () => {
    const dependencies = createDependencies();
    jest.mocked(dependencies.mfaRecovery.getIdentifiers).mockResolvedValue({
      identifiers: [SOCIAL],
      epoch: 1,
      authIdentifiers: [SOCIAL],
    });

    const identifier = await findRecoveryIdentifier(dependencies, {
      canProveSocialIdentifier: false,
    });

    expect(identifier).toBeNull();
  });

  it('ignores an enrolled identifier Auth did not approve', async () => {
    const dependencies = createDependencies();
    jest.mocked(dependencies.mfaRecovery.getIdentifiers).mockResolvedValue({
      identifiers: [PASSKEY],
      epoch: 1,
      authIdentifiers: [],
    });

    const identifier = await findRecoveryIdentifier(dependencies, {
      canProveSocialIdentifier: true,
    });

    expect(identifier).toBeNull();
  });
});

describe('recoverWalletWithoutPassword', () => {
  it('recovers the secrets, sets the new password, then restores the vault', async () => {
    const dependencies = createDependencies();
    const restoreVault = jest.fn(async () => undefined);

    await recoverWalletWithoutPassword(dependencies, {
      identifier: PASSKEY,
      newPassword: NEW_PASSWORD,
      restoreVault,
    });

    expect(
      dependencies.mfaRecovery.authenticateIdentifier,
    ).toHaveBeenCalledWith(PASSKEY);
    expect(dependencies.mfaRecovery.getRecoverySecret).toHaveBeenCalledWith(
      SESSION,
    );
    expect(dependencies.requestMfaApproval).toHaveBeenCalledWith({
      requestHash: bytesToHex(new Uint8Array(32).fill(1)),
      audiences: [TOPRF.aal2Audience],
      requireVerification: true,
      includeIdentifiers: false,
      reason: { operation: 'wallet.passwordless_recovery' },
    });
    expect(dependencies.seedless.authenticateForRecovery).toHaveBeenCalledWith({
      aal2Token: 'aal2-token',
      authConnectionId: TOPRF.authConnectionId,
      groupedAuthConnectionId: TOPRF.groupedAuthConnectionId,
    });
    expect(dependencies.seenSecret).toStrictEqual(
      new Uint8Array(RECOVERY_SECRET_LENGTH).fill(9),
    );
    expect(dependencies.seedless.setLocalPassword).toHaveBeenCalledWith({
      password: NEW_PASSWORD,
    });
    expect(
      dependencies.seedless.resetPasswordWithVaultKeys,
    ).toHaveBeenCalledWith({ newPassword: NEW_PASSWORD });
    expect(restoreVault).toHaveBeenCalledWith(NEW_PASSWORD, [
      expect.objectContaining({ type: SecretType.Mnemonic }),
    ]);
    expect(dependencies.calls).toStrictEqual([
      'authenticateIdentifier',
      'requestMfaApproval',
      'getRecoverySecret',
      'authenticateForRecovery',
      'recoverWithRecoverySecret',
      'setLocalPassword',
      'resetPasswordWithVaultKeys',
    ]);
  });

  it('reports recovering_secrets when the escrow read fails', async () => {
    const dependencies = createDependencies();
    jest
      .mocked(dependencies.mfaRecovery.getRecoverySecret)
      .mockRejectedValue(
        Object.assign(new Error('read failed'), { code: 'read_failed' }),
      );
    const restoreVault = jest.fn();

    const error = await recoverWalletWithoutPassword(dependencies, {
      identifier: PASSKEY,
      newPassword: NEW_PASSWORD,
      restoreVault,
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(PasswordlessRecoveryError);
    expect(error).toMatchObject({
      stage: 'recovering_secrets',
      code: 'read_failed',
    });
    expect(dependencies.seedless.setLocalPassword).not.toHaveBeenCalled();
    expect(restoreVault).not.toHaveBeenCalled();
  });

  it('reports setting_password and skips the vault when the password step fails', async () => {
    const dependencies = createDependencies();
    jest
      .mocked(dependencies.seedless.setLocalPassword)
      .mockRejectedValue(new Error('password rejected'));
    const restoreVault = jest.fn();

    const error = await recoverWalletWithoutPassword(dependencies, {
      identifier: PASSKEY,
      newPassword: NEW_PASSWORD,
      restoreVault,
    }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({ stage: 'setting_password' });
    expect(restoreVault).not.toHaveBeenCalled();
  });

  it('reports restoring_vault after the new password is already set', async () => {
    const dependencies = createDependencies();
    const restoreVault = jest.fn().mockRejectedValue(new Error('vault failed'));

    const error = await recoverWalletWithoutPassword(dependencies, {
      identifier: PASSKEY,
      newPassword: NEW_PASSWORD,
      restoreVault,
    }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({ stage: 'restoring_vault' });
    expect(dependencies.seedless.resetPasswordWithVaultKeys).toHaveBeenCalled();
  });
});

import { personalSign } from '@metamask/eth-sig-util';
import { secp256k1 } from '@noble/curves/secp256k1';
import { bytesToHex, sha256 } from '@metamask/utils';
import {
  bufferToHex,
  privateToAddress,
  toChecksumAddress,
} from 'ethereumjs-util';
import {
  getMfaRecoveryErrorCode,
  MfaRecoveryControllerError,
} from '../../../../../core/Engine/controllers/mfa-recovery-controller/errors';
import type { SignPersonalMessage } from '../../../../../core/Engine/controllers/mfa-recovery-controller/identifiers';
import {
  deriveTestRecoverySecret,
  runToprfRecoverySecretTest,
  type ToprfRecoverySecretTestDependencies,
  type ToprfRecoverySecretTestStep,
} from './runToprfRecoverySecretTest';

const TEST_PRIVATE_KEY = Buffer.alloc(32, 0x01);
const TEST_ADDRESS = toChecksumAddress(
  bufferToHex(privateToAddress(TEST_PRIVATE_KEY)),
);

const PUBLIC_KEY_MESSAGE = 'MetaMask TOPRF recovery secret test v1';

const signWithTestKey: SignPersonalMessage = async ({ data }) =>
  personalSign({ privateKey: TEST_PRIVATE_KEY, data });

async function computeExpectedSecret(): Promise<Uint8Array> {
  const uncompressedPublicKeyWithoutPrefix = secp256k1
    .getPublicKey(TEST_PRIVATE_KEY, false)
    .slice(1);
  return await sha256(uncompressedPublicKeyWithoutPrefix);
}

/**
 * Starts not envelope-managed with no recovery share. `authenticateForRecovery`
 * sets `recoverySession`, and `migrateToEnvelope` sets the envelope.
 */
function createSeedless(hasRecoveryShare: boolean) {
  const state: {
    envelope?: { v: 1; vaultAuthPubKey: string };
    recoverySession?: { hasRecoveryShare: boolean };
  } = {};
  return {
    state,
    authenticateForRecovery: jest.fn(async () => {
      state.recoverySession = { hasRecoveryShare };
    }),
    runMigrations: jest.fn(async () => false),
    migrateToEnvelope: jest.fn<Promise<void>, [{ recoverySecret: Uint8Array }]>(
      async () => {
        state.envelope = { v: 1, vaultAuthPubKey: 'pk' };
      },
    ),
  };
}

function createDependencies(
  seedless: ReturnType<typeof createSeedless>,
  overrides: Partial<ToprfRecoverySecretTestDependencies> = {},
): ToprfRecoverySecretTestDependencies {
  return {
    address: TEST_ADDRESS,
    signPersonalMessage: signWithTestKey,
    seedless:
      seedless as unknown as ToprfRecoverySecretTestDependencies['seedless'],
    mintAal2Token: jest.fn().mockResolvedValue('aal2-token'),
    ...overrides,
  };
}

describe('deriveTestRecoverySecret', () => {
  it('returns the same 32 bytes on repeated calls', async () => {
    const first = await deriveTestRecoverySecret(TEST_ADDRESS, signWithTestKey);
    const second = await deriveTestRecoverySecret(
      TEST_ADDRESS,
      signWithTestKey,
    );

    expect(first).toHaveLength(32);
    expect(bytesToHex(second)).toBe(bytesToHex(first));
  });

  it('matches the SHA-256 of the uncompressed public key of the test private key', async () => {
    const secret = await deriveTestRecoverySecret(
      TEST_ADDRESS,
      signWithTestKey,
    );

    expect(bytesToHex(secret)).toBe(bytesToHex(await computeExpectedSecret()));
  });

  it('signs the fixed public key message from the given address', async () => {
    const signPersonalMessage = jest.fn(signWithTestKey);

    await deriveTestRecoverySecret(TEST_ADDRESS, signPersonalMessage);

    expect(signPersonalMessage).toHaveBeenCalledTimes(1);
    expect(signPersonalMessage).toHaveBeenCalledWith({
      data: bytesToHex(new TextEncoder().encode(PUBLIC_KEY_MESSAGE)),
      from: TEST_ADDRESS,
    });
  });

  it('throws primary_account_unavailable for an empty address', async () => {
    const signPersonalMessage = jest.fn(signWithTestKey);

    const error = await deriveTestRecoverySecret('', signPersonalMessage).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(MfaRecoveryControllerError);
    expect(getMfaRecoveryErrorCode(error)).toBe('primary_account_unavailable');
    expect(signPersonalMessage).not.toHaveBeenCalled();
  });
});

describe('runToprfRecoverySecretTest', () => {
  it('mints an aal2 token and authenticates it before migrating the vault', async () => {
    const order: string[] = [];
    const seedless = createSeedless(false);
    seedless.authenticateForRecovery.mockImplementation(async () => {
      order.push('authenticate');
    });
    seedless.migrateToEnvelope.mockImplementation(async () => {
      order.push('migrate');
    });
    const dependencies = createDependencies(seedless, {
      mintAal2Token: jest.fn(async () => {
        order.push('mint');
        return 'aal2-token';
      }),
    });

    await runToprfRecoverySecretTest(dependencies);

    expect(dependencies.mintAal2Token).toHaveBeenCalledTimes(1);
    expect(seedless.authenticateForRecovery).toHaveBeenCalledWith({
      aal2Token: 'aal2-token',
      authConnectionId: 'mm-recovery-dev-aal2-common',
      groupedAuthConnectionId: 'mm-recovery-aal2-dev',
    });
    expect(order).toStrictEqual(['mint', 'authenticate', 'migrate']);
    expect(seedless.runMigrations).toHaveBeenCalledTimes(1);
  });

  it('migrates the vault with the constant test recovery secret', async () => {
    const seedless = createSeedless(false);
    const expectedSecret = await computeExpectedSecret();

    await runToprfRecoverySecretTest(createDependencies(seedless));

    expect(seedless.migrateToEnvelope).toHaveBeenCalledTimes(1);
    const [call] = seedless.migrateToEnvelope.mock.calls;
    expect(bytesToHex(call[0].recoverySecret)).toBe(bytesToHex(expectedSecret));
  });

  it('reports each step in order', async () => {
    const onStep = jest.fn<void, [ToprfRecoverySecretTestStep]>();

    await runToprfRecoverySecretTest(
      createDependencies(createSeedless(false)),
      onStep,
    );

    expect(onStep.mock.calls.map(([step]) => step)).toStrictEqual([
      'deriving_recovery_secret',
      'minting_aal2_token',
      'authenticating_aal2',
      'checking_recovery_status',
      'running_data_type_migration',
      'migrating_vault_to_envelope',
      'checking_recovery_status',
      'completed',
    ]);
  });

  it('reports the status before and after, whether a share existed, and an 8-char fingerprint', async () => {
    const result = await runToprfRecoverySecretTest(
      createDependencies(createSeedless(false)),
    );

    const expectedFingerprint = bytesToHex(
      await sha256(await computeExpectedSecret()),
    ).slice(2, 10);
    expect(result).toStrictEqual({
      before: 'NotEnabled',
      after: 'Enabled',
      shareExisted: false,
      fingerprint: expectedFingerprint,
    });
    expect(result.fingerprint).toMatch(/^[0-9a-f]{8}$/u);
  });

  it('reports shareExisted as true when the nodes already hold a recovery share', async () => {
    const result = await runToprfRecoverySecretTest(
      createDependencies(createSeedless(true)),
    );

    expect(result.shareExisted).toBe(true);
  });

  it('rethrows the error when the migration fails', async () => {
    const seedless = createSeedless(false);
    const error = new Error('migration failed');
    seedless.migrateToEnvelope.mockRejectedValueOnce(error);

    await expect(
      runToprfRecoverySecretTest(createDependencies(seedless)),
    ).rejects.toBe(error);
  });
});

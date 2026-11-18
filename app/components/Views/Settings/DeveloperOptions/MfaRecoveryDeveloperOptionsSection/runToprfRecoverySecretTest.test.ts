import { personalSign } from '@metamask/eth-sig-util';
import { secp256k1 } from '@noble/curves/secp256k1';
import { bytesToHex, sha256, stringToBytes } from '@metamask/utils';
import {
  deriveTestRecoverySecret,
  runToprfRecoverySecretTest,
  type SignMessage,
  type ToprfRecoverySecretTestDependencies,
  type ToprfRecoverySecretTestStep,
} from './runToprfRecoverySecretTest';

const TEST_PRIVATE_KEY = Buffer.alloc(32, 0x01);

const PUBLIC_KEY_MESSAGE = 'MetaMask TOPRF recovery secret test v1';

const signWithTestKey: SignMessage = async (message) =>
  personalSign({
    privateKey: TEST_PRIVATE_KEY,
    data: bytesToHex(stringToBytes(message)),
  });

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
    signMessage: signWithTestKey,
    seedless:
      seedless as unknown as ToprfRecoverySecretTestDependencies['seedless'],
    openRecoverySession: jest.fn(() => seedless.authenticateForRecovery()),
    ...overrides,
  };
}

describe('deriveTestRecoverySecret', () => {
  it('returns the same 32 bytes on repeated calls', async () => {
    const first = await deriveTestRecoverySecret(signWithTestKey);
    const second = await deriveTestRecoverySecret(signWithTestKey);

    expect(first).toHaveLength(32);
    expect(bytesToHex(second)).toBe(bytesToHex(first));
  });

  it('matches the SHA-256 of the uncompressed public key of the test private key', async () => {
    const secret = await deriveTestRecoverySecret(signWithTestKey);

    expect(bytesToHex(secret)).toBe(bytesToHex(await computeExpectedSecret()));
  });

  it('signs the fixed public key message', async () => {
    const signMessage = jest.fn(signWithTestKey);

    await deriveTestRecoverySecret(signMessage);

    expect(signMessage).toHaveBeenCalledTimes(1);
    expect(signMessage).toHaveBeenCalledWith(PUBLIC_KEY_MESSAGE);
  });

  it('propagates signer errors', async () => {
    const signerError = new Error('locked');

    await expect(
      deriveTestRecoverySecret(jest.fn().mockRejectedValue(signerError)),
    ).rejects.toBe(signerError);
  });
});

describe('runToprfRecoverySecretTest', () => {
  it('opens the aal2 recovery session before migrating the vault', async () => {
    const order: string[] = [];
    const seedless = createSeedless(false);
    seedless.migrateToEnvelope.mockImplementation(async () => {
      order.push('migrate');
    });
    const dependencies = createDependencies(seedless, {
      openRecoverySession: jest.fn(async () => {
        order.push('open_session');
      }),
    });

    await runToprfRecoverySecretTest(dependencies);

    expect(dependencies.openRecoverySession).toHaveBeenCalledTimes(1);
    expect(order).toStrictEqual(['open_session', 'migrate']);
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

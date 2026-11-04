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

function createSeedless(hasRecoveryShare: boolean) {
  return {
    getRecoveryStatus: jest
      .fn()
      .mockResolvedValueOnce({
        status: 'NotEnabled',
        verified: true,
        hasRecoveryShare,
      })
      .mockResolvedValueOnce({
        status: 'Enabled',
        verified: true,
        hasRecoveryShare: true,
      }),
    authenticateForRecovery: jest.fn().mockResolvedValue(undefined),
    storeRecoveryKeys: jest.fn().mockResolvedValue({ liveKeyMatches: true }),
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
  describe('when no recovery share exists yet', () => {
    it('mints an aal2 token and authenticates it before reading status and storing recovery keys', async () => {
      const order: string[] = [];
      const seedless = createSeedless(false);
      seedless.authenticateForRecovery.mockImplementation(async () => {
        order.push('authenticate');
      });
      const getRecoveryStatus = seedless.getRecoveryStatus;
      seedless.getRecoveryStatus = jest.fn(async () => {
        order.push('status');
        return getRecoveryStatus();
      });
      seedless.storeRecoveryKeys.mockImplementation(async () => {
        order.push('store');
        return { liveKeyMatches: true };
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
      expect(order).toStrictEqual([
        'mint',
        'authenticate',
        'status',
        'store',
        'store',
        'status',
      ]);
    });

    it('stores recovery keys twice with the same constant secret', async () => {
      const seedless = createSeedless(false);
      const expectedSecret = await computeExpectedSecret();

      await runToprfRecoverySecretTest(createDependencies(seedless));

      expect(seedless.storeRecoveryKeys).toHaveBeenCalledTimes(2);
      const [storeCall, evaluateCall] = seedless.storeRecoveryKeys.mock.calls;
      expect(bytesToHex(storeCall[0].recoverySecret)).toBe(
        bytesToHex(expectedSecret),
      );
      expect(bytesToHex(evaluateCall[0].recoverySecret)).toBe(
        bytesToHex(expectedSecret),
      );
    });

    it('reports every step in order', async () => {
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
        'storing_recovery_keys',
        'evaluating_recovery_keys',
        'checking_recovery_status',
        'completed',
      ]);
    });

    it('returns the statuses, share state, live key match and an 8-char lowercase hex fingerprint', async () => {
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
        liveKeyMatches: true,
        fingerprint: expectedFingerprint,
      });
      expect(result.fingerprint).toMatch(/^[0-9a-f]{8}$/u);
    });
  });

  describe('when a recovery share already exists', () => {
    it('only evaluates the recovery keys and skips the store step', async () => {
      const seedless = createSeedless(true);
      const onStep = jest.fn<void, [ToprfRecoverySecretTestStep]>();

      await runToprfRecoverySecretTest(createDependencies(seedless), onStep);

      expect(seedless.storeRecoveryKeys).toHaveBeenCalledTimes(1);
      expect(onStep.mock.calls.map(([step]) => step)).not.toContain(
        'storing_recovery_keys',
      );
    });

    it('reports shareExisted as true', async () => {
      const result = await runToprfRecoverySecretTest(
        createDependencies(createSeedless(true)),
      );

      expect(result.shareExisted).toBe(true);
      expect(result.liveKeyMatches).toBe(true);
    });
  });

  describe('liveKeyMatches', () => {
    it('is false when the store call reports no live key match', async () => {
      const seedless = createSeedless(false);
      seedless.storeRecoveryKeys
        .mockReset()
        .mockResolvedValueOnce({ liveKeyMatches: false })
        .mockResolvedValueOnce({ liveKeyMatches: true });

      const result = await runToprfRecoverySecretTest(
        createDependencies(seedless),
      );

      expect(result.liveKeyMatches).toBe(false);
    });

    it('is false when the evaluate call reports no live key match', async () => {
      const seedless = createSeedless(false);
      seedless.storeRecoveryKeys
        .mockReset()
        .mockResolvedValueOnce({ liveKeyMatches: true })
        .mockResolvedValueOnce({ liveKeyMatches: false });

      const result = await runToprfRecoverySecretTest(
        createDependencies(seedless),
      );

      expect(result.liveKeyMatches).toBe(false);
    });
  });

  describe('when storing recovery keys fails', () => {
    it('rethrows the error without reading the final status', async () => {
      const seedless = createSeedless(false);
      const error = new Error('recovery_key_share_conflict');
      seedless.storeRecoveryKeys.mockReset().mockRejectedValueOnce(error);

      await expect(
        runToprfRecoverySecretTest(createDependencies(seedless)),
      ).rejects.toBe(error);
      expect(seedless.getRecoveryStatus).toHaveBeenCalledTimes(1);
    });
  });
});

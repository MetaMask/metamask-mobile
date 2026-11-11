import type { Identifier } from '@metamask/mfa-recovery-controller';
import { SecretType } from '@metamask/seedless-onboarding-controller';
import {
  TOPRF_RECOVERY_AUTH_CONNECTION_ID,
  TOPRF_RECOVERY_GROUPED_AUTH_CONNECTION_ID,
} from '../../../../../core/Engine/controllers/mfa-recovery-controller/constants';
import {
  runMfaRecoveryFullRetrieval,
  type MfaRecoveryFullRetrievalDependencies,
} from './runMfaRecoveryFullRetrieval';

const mockPrepareRecoveryRun = jest.fn();
const mockReadRecoverySecret = jest.fn();

jest.mock('./runMfaRecoveryCubistTest', () => ({
  prepareRecoveryRun: (...args: unknown[]) => mockPrepareRecoveryRun(...args),
  readRecoverySecret: (...args: unknown[]) => mockReadRecoverySecret(...args),
}));

const SIWE_IDENTIFIER = { type: 'siwe', value: '0xabc' } as Identifier;
const RECOVERY_SECRET = new Uint8Array(32).fill(9);
const SRP_ONE = new TextEncoder().encode('seed phrase one');
const SRP_TWO = new TextEncoder().encode('seed phrase two');

function createSeedless(options: {
  before: unknown[];
  recovered: unknown[];
  order?: string[];
}) {
  return {
    fetchAllSecretData: jest.fn(async () => {
      options.order?.push('fetch');
      return options.before;
    }),
    authenticateForRecovery: jest.fn(async () => {
      options.order?.push('authenticate');
    }),
    recoverWithRecoverySecret: jest.fn(async () => {
      options.order?.push('recover');
      return options.recovered;
    }),
  };
}

function createDependencies(
  seedless: ReturnType<typeof createSeedless>,
  overrides: Partial<
    Pick<
      MfaRecoveryFullRetrievalDependencies,
      'identifierType' | 'authenticateSeedless' | 'mintAal2Token'
    >
  > = {},
): MfaRecoveryFullRetrievalDependencies {
  return {
    controller: {} as MfaRecoveryFullRetrievalDependencies['controller'],
    identifierRouter:
      {} as MfaRecoveryFullRetrievalDependencies['identifierRouter'],
    address: '0xabc',
    randomBytes: (length) => new Uint8Array(length),
    verifyMfa: jest.fn().mockResolvedValue(undefined),
    getAuthIdentifiers: jest.fn().mockResolvedValue([]),
    mintAal2Token: jest.fn().mockResolvedValue('aal2-token'),
    seedless:
      seedless as unknown as MfaRecoveryFullRetrievalDependencies['seedless'],
    identifierType: 'siwe',
    authenticateSeedless: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('runMfaRecoveryFullRetrieval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrepareRecoveryRun.mockResolvedValue({
      controller: {},
      identifiers: {
        siweIdentifier: SIWE_IDENTIFIER,
        passkeyIdentifier: { type: 'passkey', value: 'cred' } as Identifier,
      },
    });
    mockReadRecoverySecret.mockResolvedValue({
      recoverySecret: RECOVERY_SECRET,
      epoch: 2,
    });
  });

  it('reads the recovery secret with the SIWE identifier and recovers the vault keys with it, without a password', async () => {
    const seedless = createSeedless({
      before: [{ type: SecretType.Mnemonic, data: SRP_ONE }],
      recovered: [{ type: SecretType.Mnemonic, data: SRP_ONE }],
    });
    const dependencies = createDependencies(seedless);

    await runMfaRecoveryFullRetrieval(dependencies);

    expect(mockReadRecoverySecret).toHaveBeenCalledWith(
      expect.anything(),
      SIWE_IDENTIFIER,
      expect.any(Function),
    );
    expect(seedless.authenticateForRecovery).toHaveBeenCalledWith({
      aal2Token: 'aal2-token',
      authConnectionId: TOPRF_RECOVERY_AUTH_CONNECTION_ID,
      groupedAuthConnectionId: TOPRF_RECOVERY_GROUPED_AUTH_CONNECTION_ID,
    });
    expect(seedless.recoverWithRecoverySecret).toHaveBeenCalledWith({
      recoverySecret: RECOVERY_SECRET,
    });
  });

  it('snapshots the SRPs, authenticates seedless and aal2, then recovers the vault', async () => {
    const order: string[] = [];
    const seedless = createSeedless({
      before: [{ type: SecretType.Mnemonic, data: SRP_ONE }],
      recovered: [{ type: SecretType.Mnemonic, data: SRP_ONE }],
      order,
    });

    await runMfaRecoveryFullRetrieval(
      createDependencies(seedless, {
        authenticateSeedless: jest.fn(async () => {
          order.push('seedless');
        }),
      }),
    );

    expect(order).toStrictEqual([
      'fetch',
      'seedless',
      'authenticate',
      'recover',
    ]);
  });

  it('mints one aal2 token and passes that same token to authenticateForRecovery', async () => {
    const seedless = createSeedless({
      before: [{ type: SecretType.Mnemonic, data: SRP_ONE }],
      recovered: [{ type: SecretType.Mnemonic, data: SRP_ONE }],
    });
    const dependencies = createDependencies(seedless);

    await runMfaRecoveryFullRetrieval(dependencies);

    expect(dependencies.mintAal2Token).toHaveBeenCalledTimes(1);
    expect(seedless.authenticateForRecovery).toHaveBeenCalledWith(
      expect.objectContaining({ aal2Token: 'aal2-token' }),
    );
  });

  it('reads the recovery secret with the passkey identifier when the user chose passkey', async () => {
    const passkeyIdentifier = {
      type: 'passkey',
      value: 'cred',
    } as Identifier;
    mockPrepareRecoveryRun.mockResolvedValue({
      controller: {},
      identifiers: { siweIdentifier: SIWE_IDENTIFIER, passkeyIdentifier },
    });
    const seedless = createSeedless({
      before: [{ type: SecretType.Mnemonic, data: SRP_ONE }],
      recovered: [{ type: SecretType.Mnemonic, data: SRP_ONE }],
    });

    await runMfaRecoveryFullRetrieval(
      createDependencies(seedless, { identifierType: 'passkey' }),
    );

    expect(mockReadRecoverySecret).toHaveBeenCalledWith(
      expect.anything(),
      passkeyIdentifier,
      expect.any(Function),
    );
  });

  it('reports the seedless social authentication step', async () => {
    const seedless = createSeedless({
      before: [],
      recovered: [],
    });
    const steps: string[] = [];
    const authenticateSeedless = jest.fn().mockRejectedValue(new Error('x'));

    await expect(
      runMfaRecoveryFullRetrieval(
        createDependencies(seedless, { authenticateSeedless }),
        (step) => steps.push(step),
      ),
    ).rejects.toThrow('x');

    expect(authenticateSeedless).toHaveBeenCalledTimes(1);
    expect(steps).toContain('authenticating_seedless');
    expect(seedless.authenticateForRecovery).not.toHaveBeenCalled();
    expect(seedless.recoverWithRecoverySecret).not.toHaveBeenCalled();
  });

  it('reports all SRPs recovered when every pre-recovery SRP comes back', async () => {
    const seedless = createSeedless({
      before: [
        { type: SecretType.Mnemonic, data: SRP_ONE },
        { type: SecretType.Mnemonic, data: SRP_TWO },
      ],
      recovered: [
        { type: SecretType.Mnemonic, data: SRP_TWO },
        { type: SecretType.Mnemonic, data: SRP_ONE },
      ],
    });

    const result = await runMfaRecoveryFullRetrieval(
      createDependencies(seedless),
    );

    expect(result).toStrictEqual({
      expectedSrpCount: 2,
      recoveredSrpCount: 2,
      matchedSrpCount: 2,
      allSrpsRecovered: true,
    });
  });

  it('reports a missing SRP when the recovered set lacks one', async () => {
    const seedless = createSeedless({
      before: [
        { type: SecretType.Mnemonic, data: SRP_ONE },
        { type: SecretType.Mnemonic, data: SRP_TWO },
      ],
      recovered: [{ type: SecretType.Mnemonic, data: SRP_ONE }],
    });

    const result = await runMfaRecoveryFullRetrieval(
      createDependencies(seedless),
    );

    expect(result).toStrictEqual({
      expectedSrpCount: 2,
      recoveredSrpCount: 1,
      matchedSrpCount: 1,
      allSrpsRecovered: false,
    });
  });

  it('ignores secret data that is not a seed phrase', async () => {
    const seedless = createSeedless({
      before: [
        { type: SecretType.Mnemonic, data: SRP_ONE },
        { type: SecretType.PrivateKey, data: SRP_TWO },
      ],
      recovered: [{ type: SecretType.Mnemonic, data: SRP_ONE }],
    });

    const result = await runMfaRecoveryFullRetrieval(
      createDependencies(seedless),
    );

    expect(result).toMatchObject({
      expectedSrpCount: 1,
      matchedSrpCount: 1,
      allSrpsRecovered: true,
    });
  });

  it('does not report success when the vault held no SRPs to compare', async () => {
    const seedless = createSeedless({
      before: [],
      recovered: [{ type: SecretType.Mnemonic, data: SRP_ONE }],
    });

    const result = await runMfaRecoveryFullRetrieval(
      createDependencies(seedless),
    );

    expect(result.allSrpsRecovered).toBe(false);
  });
});

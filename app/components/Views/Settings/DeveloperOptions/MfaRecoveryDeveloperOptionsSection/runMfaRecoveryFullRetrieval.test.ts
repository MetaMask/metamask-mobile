import type { Identifier } from '@metamask/mfa-recovery-controller';
import { SecretType } from '@metamask/seedless-onboarding-controller';
import type { MfaRecoveryService } from '../../../../../core/MfaRecovery/services/mfa-recovery-service';
import {
  runMfaRecoveryFullRetrieval,
  type MfaRecoveryFullRetrievalDependencies,
  type MfaRecoveryFullRetrievalStep,
} from './runMfaRecoveryFullRetrieval';

const mockPrepareRun = jest.fn();
const mockReadRecoverySecret = jest.fn();
const mockOpenRecoverySession = jest.fn();
const service = {
  prepareRun: mockPrepareRun,
  readRecoverySecret: mockReadRecoverySecret,
  openRecoverySession: mockOpenRecoverySession,
} as unknown as MfaRecoveryService;

const SIWE_IDENTIFIER = { type: 'siwe', value: '0xabc' } as Identifier;
const PASSKEY_IDENTIFIER = { type: 'passkey', value: 'cred' } as Identifier;
const SRP_ONE = new TextEncoder().encode('seed phrase one');
const SRP_TWO = new TextEncoder().encode('seed phrase two');
const LOCAL_PASSWORD = 'local-pw';

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
    recoverWithRecoverySecret: jest.fn(
      async ({
        recoverySecret,
      }: {
        recoverySecret: Uint8Array;
        password: string;
      }) => {
        options.order?.push(`recover:${recoverySecret[0]}`);
        return options.recovered;
      },
    ),
  };
}

function createDependencies(
  seedless: ReturnType<typeof createSeedless>,
  identifierType: MfaRecoveryFullRetrievalDependencies['identifierType'] = 'siwe',
): MfaRecoveryFullRetrievalDependencies {
  return {
    seedless:
      seedless as unknown as MfaRecoveryFullRetrievalDependencies['seedless'],
    identifierType,
    localPassword: LOCAL_PASSWORD,
  };
}

describe('runMfaRecoveryFullRetrieval', () => {
  let recoverySecret: Uint8Array;

  beforeEach(() => {
    jest.clearAllMocks();
    recoverySecret = new Uint8Array(32).fill(9);
    mockPrepareRun.mockResolvedValue({
      siweIdentifier: SIWE_IDENTIFIER,
      passkeyIdentifier: PASSKEY_IDENTIFIER,
    });
    mockOpenRecoverySession.mockResolvedValue(undefined);
    mockReadRecoverySecret.mockImplementation(async () => ({
      recoverySecret,
      epoch: 2,
    }));
  });

  it('reads the recovery secret with the SIWE identifier and recovers the vault with it under the local password', async () => {
    const order: string[] = [];
    const seedless = createSeedless({
      before: [{ type: SecretType.Mnemonic, data: SRP_ONE }],
      recovered: [{ type: SecretType.Mnemonic, data: SRP_ONE }],
      order,
    });

    await runMfaRecoveryFullRetrieval(service, createDependencies(seedless));

    expect(mockReadRecoverySecret).toHaveBeenCalledWith(SIWE_IDENTIFIER);
    expect(order).toStrictEqual(['fetch', 'recover:9']);
    expect(seedless.recoverWithRecoverySecret).toHaveBeenCalledWith({
      recoverySecret,
      password: LOCAL_PASSWORD,
    });
  });

  it('opens the recovery session after reading the secret and before recovering', async () => {
    const order: string[] = [];
    mockReadRecoverySecret.mockImplementation(async () => {
      order.push('read');
      return { recoverySecret, epoch: 2 };
    });
    mockOpenRecoverySession.mockImplementation(async () => {
      order.push('open_session');
    });
    const seedless = createSeedless({
      before: [{ type: SecretType.Mnemonic, data: SRP_ONE }],
      recovered: [{ type: SecretType.Mnemonic, data: SRP_ONE }],
      order,
    });

    await runMfaRecoveryFullRetrieval(service, createDependencies(seedless));

    expect(order).toStrictEqual(['fetch', 'read', 'open_session', 'recover:9']);
  });

  it('reads the recovery secret with the passkey identifier when the user chose passkey', async () => {
    const seedless = createSeedless({
      before: [{ type: SecretType.Mnemonic, data: SRP_ONE }],
      recovered: [{ type: SecretType.Mnemonic, data: SRP_ONE }],
    });

    await runMfaRecoveryFullRetrieval(
      service,
      createDependencies(seedless, 'passkey'),
    );

    expect(mockReadRecoverySecret).toHaveBeenCalledWith(PASSKEY_IDENTIFIER);
  });

  it('zeroes the recovery secret after recovering', async () => {
    const seedless = createSeedless({ before: [], recovered: [] });

    await runMfaRecoveryFullRetrieval(service, createDependencies(seedless));

    expect(recoverySecret.every((byte) => byte === 0)).toBe(true);
  });

  it('zeroes the recovery secret and skips recovery when the session fails to open', async () => {
    mockOpenRecoverySession.mockRejectedValueOnce(new Error('aal2 failed'));
    const seedless = createSeedless({ before: [], recovered: [] });
    const steps: MfaRecoveryFullRetrievalStep[] = [];

    await expect(
      runMfaRecoveryFullRetrieval(
        service,
        createDependencies(seedless),
        (step) => steps.push(step),
      ),
    ).rejects.toThrow('aal2 failed');

    expect(steps).toContain('authenticating_aal2');
    expect(seedless.recoverWithRecoverySecret).not.toHaveBeenCalled();
    expect(recoverySecret.every((byte) => byte === 0)).toBe(true);
  });

  it('reports each step in order', async () => {
    const seedless = createSeedless({ before: [], recovered: [] });
    const steps: MfaRecoveryFullRetrievalStep[] = [];

    await runMfaRecoveryFullRetrieval(
      service,
      createDependencies(seedless),
      (step) => steps.push(step),
    );

    expect(steps).toStrictEqual([
      'fetching_srps',
      'reading_recovery_secret',
      'authenticating_aal2',
      'recovering_vault',
      'checking_srps',
      'completed',
    ]);
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
      service,
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
      service,
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
      service,
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
      service,
      createDependencies(seedless),
    );

    expect(result.allSrpsRecovered).toBe(false);
  });
});

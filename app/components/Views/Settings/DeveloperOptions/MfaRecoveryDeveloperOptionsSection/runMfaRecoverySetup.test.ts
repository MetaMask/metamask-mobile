import type { Identifier } from '@metamask/mfa-recovery-controller';
import {
  TOPRF_RECOVERY_AUTH_CONNECTION_ID,
  TOPRF_RECOVERY_GROUPED_AUTH_CONNECTION_ID,
} from '../../../../../core/Engine/controllers/mfa-recovery-controller/constants';
import {
  getMfaRecoveryStatus,
  runMfaRecoverySetup,
  type MfaRecoverySetupDependencies,
} from './runMfaRecoverySetup';

const mockPrepareRecoveryRun = jest.fn();

jest.mock('./runMfaRecoveryCubistTest', () => ({
  prepareRecoveryRun: (...args: unknown[]) => mockPrepareRecoveryRun(...args),
}));

const SIWE_IDENTIFIER = { type: 'siwe', value: '0xabc' } as Identifier;
const PASSKEY_IDENTIFIER = { type: 'passkey', value: 'cred' } as Identifier;
const AUTH_PASSKEY_IDENTIFIER = {
  type: 'passkey',
  value: 'auth-cred',
} as Identifier;
const AUTH_SIWE_IDENTIFIER = { type: 'siwe', value: '0xdef' } as Identifier;
const RECOVERY_SECRET = new Uint8Array(32).fill(7);

function createController() {
  return { register: jest.fn().mockResolvedValue(undefined) };
}

/** Starts not envelope-managed; `migrateToEnvelope` sets the envelope. */
function createSeedless() {
  const state: { envelope?: { v: 1; vaultAuthPubKey: string } } = {};
  return {
    state,
    authenticateForRecovery: jest.fn().mockResolvedValue(undefined),
    runMigrations: jest.fn().mockResolvedValue(false),
    migrateToEnvelope: jest.fn(async () => {
      state.envelope = { v: 1, vaultAuthPubKey: 'pk' };
    }),
  };
}

function createDependencies(
  seedless: ReturnType<typeof createSeedless>,
  overrides: Partial<MfaRecoverySetupDependencies> = {},
): MfaRecoverySetupDependencies {
  return {
    controller: {} as MfaRecoverySetupDependencies['controller'],
    identifierRouter: {} as MfaRecoverySetupDependencies['identifierRouter'],
    address: '0xabc',
    randomBytes: (length) => new Uint8Array(length).fill(7),
    verifyMfa: jest.fn().mockResolvedValue(undefined),
    mintAal2Token: jest.fn().mockResolvedValue('aal2-token'),
    getAuthIdentifiers: jest
      .fn()
      .mockResolvedValue([AUTH_SIWE_IDENTIFIER, AUTH_PASSKEY_IDENTIFIER]),
    seedless: seedless as unknown as MfaRecoverySetupDependencies['seedless'],
    ...overrides,
  };
}

describe('getMfaRecoveryStatus', () => {
  it('is NotEnabled when the vault is not envelope-managed', () => {
    expect(getMfaRecoveryStatus({})).toBe('NotEnabled');
  });

  it('is Enabled when the vault is envelope-managed', () => {
    expect(
      getMfaRecoveryStatus({
        envelope: { v: 1, vaultAuthPubKey: 'pk' },
      }),
    ).toBe('Enabled');
  });
});

describe('runMfaRecoverySetup', () => {
  let controller: ReturnType<typeof createController>;
  let seedless: ReturnType<typeof createSeedless>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = createController();
    seedless = createSeedless();
    mockPrepareRecoveryRun.mockResolvedValue({
      controller,
      identifiers: {
        siweIdentifier: SIWE_IDENTIFIER,
        passkeyIdentifier: PASSKEY_IDENTIFIER,
      },
    });
  });

  it('registers a fresh recovery secret with the identifiers from Auth unchanged', async () => {
    await runMfaRecoverySetup(createDependencies(seedless));

    expect(controller.register).toHaveBeenCalledWith(RECOVERY_SECRET, [
      AUTH_SIWE_IDENTIFIER,
      AUTH_PASSKEY_IDENTIFIER,
    ]);
  });

  it('authenticates the aal2 token for recovery', async () => {
    await runMfaRecoverySetup(createDependencies(seedless));

    expect(seedless.authenticateForRecovery).toHaveBeenCalledWith({
      aal2Token: 'aal2-token',
      authConnectionId: TOPRF_RECOVERY_AUTH_CONNECTION_ID,
      groupedAuthConnectionId: TOPRF_RECOVERY_GROUPED_AUTH_CONNECTION_ID,
    });
  });

  it('runs the data type migration before migrating the vault to envelope encryption', async () => {
    const order: string[] = [];
    seedless.runMigrations.mockImplementation(async () => {
      order.push('runMigrations');
      return false;
    });
    seedless.migrateToEnvelope.mockImplementation(async () => {
      order.push('migrate');
    });

    await runMfaRecoverySetup(createDependencies(seedless));

    expect(order).toStrictEqual(['runMigrations', 'migrate']);
  });

  it('migrates the vault to envelope encryption with the registered secret', async () => {
    await runMfaRecoverySetup(createDependencies(seedless));

    expect(seedless.migrateToEnvelope).toHaveBeenCalledWith({
      recoverySecret: RECOVERY_SECRET,
    });
  });

  it('returns the recovery status before and after setup', async () => {
    const result = await runMfaRecoverySetup(createDependencies(seedless));

    expect(result).toStrictEqual({ before: 'NotEnabled', after: 'Enabled' });
  });

  it('registers with the escrow before authenticating and migrating the vault', async () => {
    const order: string[] = [];
    controller.register.mockImplementation(async () => {
      order.push('register');
    });
    seedless.authenticateForRecovery.mockImplementation(async () => {
      order.push('authenticate');
    });
    seedless.migrateToEnvelope.mockImplementation(async () => {
      order.push('migrate');
    });

    await runMfaRecoverySetup(createDependencies(seedless));

    expect(order).toStrictEqual(['register', 'authenticate', 'migrate']);
  });

  it('reports each step in order', async () => {
    const onStep = jest.fn();

    await runMfaRecoverySetup(createDependencies(seedless), onStep);

    expect(onStep.mock.calls.map(([step]) => step)).toStrictEqual([
      'checking_recovery_status',
      'registering_recovery_secret',
      'minting_aal2_token',
      'authenticating_aal2',
      'running_data_type_migration',
      'migrating_vault_to_envelope',
      'checking_recovery_status',
      'completed',
    ]);
  });

  it('does not migrate the vault when the escrow registration fails', async () => {
    const error = new Error('register failed');
    controller.register.mockRejectedValueOnce(error);

    await expect(
      runMfaRecoverySetup(createDependencies(seedless)),
    ).rejects.toBe(error);
    expect(seedless.migrateToEnvelope).not.toHaveBeenCalled();
  });
});

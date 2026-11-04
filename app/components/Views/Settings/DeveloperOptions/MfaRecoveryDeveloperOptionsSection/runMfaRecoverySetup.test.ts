import type { Identifier } from '@metamask/mfa-recovery-controller';
import {
  TOPRF_RECOVERY_AUTH_CONNECTION_ID,
  TOPRF_RECOVERY_GROUPED_AUTH_CONNECTION_ID,
} from '../../../../../core/Engine/controllers/mfa-recovery-controller/constants';
import {
  runMfaRecoverySetup,
  type MfaRecoverySetupDependencies,
} from './runMfaRecoverySetup';

const mockPrepareRecoveryRun = jest.fn();

jest.mock('./runMfaRecoveryCubistTest', () => ({
  prepareRecoveryRun: (...args: unknown[]) => mockPrepareRecoveryRun(...args),
}));

const SIWE_IDENTIFIER = { type: 'siwe', value: '0xabc' } as Identifier;
const PASSKEY_IDENTIFIER = { type: 'passkey', value: 'cred' } as Identifier;
const RECOVERY_SECRET = new Uint8Array(32).fill(7);

function createController() {
  return { register: jest.fn().mockResolvedValue(undefined) };
}

function createSeedless() {
  return {
    authenticateForRecovery: jest.fn().mockResolvedValue(undefined),
    getRecoveryStatus: jest
      .fn()
      .mockResolvedValueOnce({ status: 'NotEnabled' })
      .mockResolvedValueOnce({ status: 'Enabled' }),
    storeRecoveryKeys: jest.fn().mockResolvedValue({ liveKeyMatches: true }),
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
    seedless: seedless as unknown as MfaRecoverySetupDependencies['seedless'],
    ...overrides,
  };
}

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

  it('registers a fresh recovery secret with both identifiers', async () => {
    await runMfaRecoverySetup(createDependencies(seedless));

    expect(controller.register).toHaveBeenCalledWith(RECOVERY_SECRET, [
      SIWE_IDENTIFIER,
      PASSKEY_IDENTIFIER,
    ]);
  });

  it('stores the TOPRF recovery keys for the registered secret at aal2', async () => {
    await runMfaRecoverySetup(createDependencies(seedless));

    expect(seedless.authenticateForRecovery).toHaveBeenCalledWith({
      aal2Token: 'aal2-token',
      authConnectionId: TOPRF_RECOVERY_AUTH_CONNECTION_ID,
      groupedAuthConnectionId: TOPRF_RECOVERY_GROUPED_AUTH_CONNECTION_ID,
    });
    expect(seedless.storeRecoveryKeys).toHaveBeenCalledWith({
      recoverySecret: RECOVERY_SECRET,
    });
  });

  it('returns the recovery status before and after setup', async () => {
    const result = await runMfaRecoverySetup(createDependencies(seedless));

    expect(result).toStrictEqual({ before: 'NotEnabled', after: 'Enabled' });
  });

  it('registers with the escrow before storing the TOPRF recovery keys', async () => {
    const order: string[] = [];
    controller.register.mockImplementation(async () => {
      order.push('register');
    });
    seedless.storeRecoveryKeys.mockImplementation(async () => {
      order.push('store');
      return { liveKeyMatches: true };
    });

    await runMfaRecoverySetup(createDependencies(seedless));

    expect(order).toStrictEqual(['register', 'store']);
  });

  it('reports each step in order', async () => {
    const onStep = jest.fn();

    await runMfaRecoverySetup(createDependencies(seedless), onStep);

    expect(onStep.mock.calls.map(([step]) => step)).toStrictEqual([
      'minting_aal2_token',
      'authenticating_aal2',
      'checking_recovery_status',
      'registering_recovery_secret',
      'storing_recovery_keys',
      'checking_recovery_status',
      'completed',
    ]);
  });

  it('does not store TOPRF recovery keys when the escrow registration fails', async () => {
    const error = new Error('register failed');
    controller.register.mockRejectedValueOnce(error);

    await expect(
      runMfaRecoverySetup(createDependencies(seedless)),
    ).rejects.toBe(error);
    expect(seedless.storeRecoveryKeys).not.toHaveBeenCalled();
  });
});

import type { Identifier } from '@metamask/mfa-recovery-controller';
import type { MfaRecoveryService } from '../../../../../core/MfaRecovery/services/mfa-recovery-service';
import {
  runMfaRecoveryCubistRecover,
  type MfaRecoveryRecoverStep,
} from './runMfaRecoveryCubistRecover';

const SIWE_IDENTIFIER = { type: 'siwe', value: '0xabc' } as Identifier;
const PASSKEY_IDENTIFIER = { type: 'passkey', value: 'cred' } as Identifier;
const SOCIAL_IDENTIFIER = { type: 'social', value: 'google' } as Identifier;
const EPOCH = 4;
const SECRET_BYTE = 9;
const FINGERPRINT_LENGTH = 8;

const mockPrepareRun = jest.fn();
const mockReadRecoverySecret = jest.fn();
const service = {
  prepareRun: mockPrepareRun,
  readRecoverySecret: mockReadRecoverySecret,
} as unknown as MfaRecoveryService;

describe('runMfaRecoveryCubistRecover', () => {
  let recoverySecret: Uint8Array;

  beforeEach(() => {
    jest.clearAllMocks();
    recoverySecret = new Uint8Array(32).fill(SECRET_BYTE);
    mockPrepareRun.mockResolvedValue({
      siweIdentifier: SIWE_IDENTIFIER,
      passkeyIdentifier: PASSKEY_IDENTIFIER,
    });
    mockReadRecoverySecret.mockImplementation(async () => ({
      epoch: EPOCH,
      recoverySecret,
    }));
  });

  it('reads the secret with the SIWE identifier by default', async () => {
    await runMfaRecoveryCubistRecover(service);

    expect(mockReadRecoverySecret).toHaveBeenCalledWith(SIWE_IDENTIFIER);
  });

  it('reads the secret with the passkey identifier when asked', async () => {
    await runMfaRecoveryCubistRecover(service, undefined, 'passkey');

    expect(mockReadRecoverySecret).toHaveBeenCalledWith(PASSKEY_IDENTIFIER);
  });

  it('reads the secret with the social identifier that is passed in', async () => {
    await runMfaRecoveryCubistRecover(
      service,
      undefined,
      'social',
      SOCIAL_IDENTIFIER,
    );

    expect(mockReadRecoverySecret).toHaveBeenCalledWith(SOCIAL_IDENTIFIER);
  });

  it('rejects a social read when Auth approved no social identifier', async () => {
    await expect(
      runMfaRecoveryCubistRecover(service, undefined, 'social'),
    ).rejects.toMatchObject({ code: 'social_login_unavailable' });

    expect(mockReadRecoverySecret).not.toHaveBeenCalled();
  });

  it('returns the epoch and a short fingerprint, not the secret', async () => {
    const result = await runMfaRecoveryCubistRecover(service);

    expect(result.epoch).toBe(EPOCH);
    expect(result.fingerprint).toMatch(
      new RegExp(`^[0-9a-f]{${FINGERPRINT_LENGTH}}$`, 'u'),
    );
    expect(JSON.stringify(result)).not.toContain('09090909');
  });

  it('returns the same fingerprint for the same secret read with different identifiers', async () => {
    const siwe = await runMfaRecoveryCubistRecover(service, undefined, 'siwe');
    recoverySecret = new Uint8Array(32).fill(SECRET_BYTE);
    const passkey = await runMfaRecoveryCubistRecover(
      service,
      undefined,
      'passkey',
    );

    expect(passkey.fingerprint).toBe(siwe.fingerprint);
  });

  it('returns a different fingerprint for a different secret', async () => {
    const first = await runMfaRecoveryCubistRecover(service);
    recoverySecret = new Uint8Array(32).fill(SECRET_BYTE + 1);
    const second = await runMfaRecoveryCubistRecover(service);

    expect(second.fingerprint).not.toBe(first.fingerprint);
  });

  it('zeroes the secret after the read', async () => {
    await runMfaRecoveryCubistRecover(service);

    expect(Array.from(recoverySecret).every((byte) => byte === 0)).toBe(true);
  });

  it('reports the steps in order', async () => {
    const steps: MfaRecoveryRecoverStep[] = [];

    await runMfaRecoveryCubistRecover(service, (step) => steps.push(step));

    expect(steps).toStrictEqual(['reading_recovery_secret', 'completed']);
  });

  it('does not report completion when the read fails', async () => {
    mockReadRecoverySecret.mockRejectedValueOnce(new Error('escrow down'));
    const steps: MfaRecoveryRecoverStep[] = [];

    await expect(
      runMfaRecoveryCubistRecover(service, (step) => steps.push(step)),
    ).rejects.toThrow('escrow down');

    expect(steps).toStrictEqual(['reading_recovery_secret']);
  });
});

import type { Identifier } from '@metamask/mfa-recovery-controller';
import type { MfaRecoveryService } from './services/mfa-recovery-service';
import { createMfaRecoveryService } from './engineBindings';
import { PASSWORDLESS_RECOVERY_SETUP_OPERATION } from './setupPasswordlessRecovery';
import {
  removePasskeyFromRecovery,
  syncRecoveryAfterEnroll,
} from './syncRecoveryIdentifiers';

jest.mock('./engineBindings', () => ({ createMfaRecoveryService: jest.fn() }));

const PASSKEY: Identifier = {
  type: 'passkey',
  namespace: 'auth.example',
  value: 'credential',
} as Identifier;
const SIWE: Identifier = {
  type: 'siwe',
  namespace: 'eip155',
  value: '0xabc',
} as Identifier;
const SOCIAL: Identifier = {
  type: 'social',
  namespace: 'google',
  value: 'user',
} as Identifier;

const verifyMfa = jest.fn();

const NEW_PASSKEY: Identifier = {
  ...PASSKEY,
  value: 'new-credential',
} as Identifier;

function createService({
  status = 'Enabled',
  unenrolledPasskeys = [] as Identifier[],
  candidates = {} as Partial<Record<string, Identifier>>,
  enrolledPasskey = PASSKEY as Identifier | null,
}: {
  status?: 'Enabled' | 'NotEnabled';
  unenrolledPasskeys?: Identifier[];
  candidates?: Partial<Record<string, Identifier>>;
  /** `null` when Cubist does not have the passkey being removed. */
  enrolledPasskey?: Identifier | null;
} = {}) {
  const service = {
    getStatus: jest.fn().mockReturnValue(status),
    getCandidateIdentifiers: jest.fn().mockResolvedValue(candidates),
    setUp: jest.fn().mockResolvedValue('enabled'),
    addIdentifier: jest.fn().mockResolvedValue({}),
    getUnenrolledPasskeyIdentifiers: jest
      .fn()
      .mockResolvedValue(unenrolledPasskeys),
    findEnrolledPasskeyIdentifier: jest
      .fn()
      .mockResolvedValue(enrolledPasskey ?? undefined),
    removeIdentifier: jest.fn().mockResolvedValue({}),
  };
  jest
    .mocked(createMfaRecoveryService)
    .mockReturnValue(service as unknown as MfaRecoveryService);
  return service;
}

describe('syncRecoveryAfterEnroll', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('gives the service the social link email prompt for setup', async () => {
    createService({ status: 'NotEnabled', candidates: { siwe: SIWE } });
    const getSocialLinkEmail = jest.fn();

    await syncRecoveryAfterEnroll('totp', { verifyMfa, getSocialLinkEmail });

    expect(createMfaRecoveryService).toHaveBeenCalledWith(
      expect.objectContaining({ getSocialLinkEmail }),
    );
  });

  it("builds the service with the caller's verifyMfa and the setup approval operation", async () => {
    createService();

    await syncRecoveryAfterEnroll('totp', { verifyMfa });

    expect(createMfaRecoveryService).toHaveBeenCalledWith({
      verifyMfa,
      approvalOperation: PASSWORDLESS_RECOVERY_SETUP_OPERATION,
    });
  });

  it("builds a new service with each call's own verifyMfa", async () => {
    createService();
    const verifyPasskey = jest.fn();
    const verifyTotp = jest.fn();

    await syncRecoveryAfterEnroll('passkey', { verifyMfa: verifyPasskey });
    await syncRecoveryAfterEnroll('totp', { verifyMfa: verifyTotp });

    expect(createMfaRecoveryService).toHaveBeenNthCalledWith(1, {
      verifyMfa: verifyPasskey,
      approvalOperation: PASSWORDLESS_RECOVERY_SETUP_OPERATION,
    });
    expect(createMfaRecoveryService).toHaveBeenNthCalledWith(2, {
      verifyMfa: verifyTotp,
      approvalOperation: PASSWORDLESS_RECOVERY_SETUP_OPERATION,
    });
  });

  it('sets recovery up with the candidate identifiers on first enrollment', async () => {
    const service = createService({
      status: 'NotEnabled',
      candidates: { siwe: SIWE, social: SOCIAL, passkey: PASSKEY },
    });

    await syncRecoveryAfterEnroll('passkey', { verifyMfa });

    expect(service.setUp).toHaveBeenCalledWith([SIWE, SOCIAL, PASSKEY]);
    expect(service.addIdentifier).not.toHaveBeenCalled();
  });

  it('skips missing candidates when setting recovery up', async () => {
    const service = createService({
      status: 'NotEnabled',
      candidates: { siwe: SIWE, passkey: undefined },
    });

    await syncRecoveryAfterEnroll('totp', { verifyMfa });

    expect(service.setUp).toHaveBeenCalledWith([SIWE]);
  });

  it('adds a new passkey when recovery is set up', async () => {
    const service = createService({ unenrolledPasskeys: [NEW_PASSKEY] });

    await syncRecoveryAfterEnroll('passkey', { verifyMfa });

    expect(service.addIdentifier).toHaveBeenCalledWith(NEW_PASSKEY);
    expect(service.setUp).not.toHaveBeenCalled();
  });

  it('adds each passkey Cubist does not have, one at a time', async () => {
    const service = createService({
      unenrolledPasskeys: [PASSKEY, NEW_PASSKEY],
    });

    await syncRecoveryAfterEnroll('passkey', { verifyMfa });

    expect(service.addIdentifier).toHaveBeenCalledTimes(2);
    expect(service.addIdentifier).toHaveBeenNthCalledWith(1, PASSKEY);
    expect(service.addIdentifier).toHaveBeenNthCalledWith(2, NEW_PASSKEY);
  });

  it('does nothing when Cubist already has every passkey', async () => {
    const service = createService({ unenrolledPasskeys: [] });

    await syncRecoveryAfterEnroll('passkey', { verifyMfa });

    expect(service.addIdentifier).not.toHaveBeenCalled();
    expect(service.setUp).not.toHaveBeenCalled();
  });

  it('does nothing for a non-passkey method once recovery is set up', async () => {
    const service = createService({ unenrolledPasskeys: [NEW_PASSKEY] });

    await syncRecoveryAfterEnroll('totp', { verifyMfa });

    expect(service.getUnenrolledPasskeyIdentifiers).not.toHaveBeenCalled();
    expect(service.addIdentifier).not.toHaveBeenCalled();
    expect(service.setUp).not.toHaveBeenCalled();
  });

  it('propagates add failures to the caller', async () => {
    const service = createService({ unenrolledPasskeys: [NEW_PASSKEY] });
    service.addIdentifier.mockRejectedValue(new Error('add failed'));

    await expect(
      syncRecoveryAfterEnroll('passkey', { verifyMfa }),
    ).rejects.toThrow('add failed');
  });

  it('propagates setup failures to the caller', async () => {
    const service = createService({
      status: 'NotEnabled',
      candidates: { siwe: SIWE },
    });
    service.setUp.mockRejectedValue(new Error('setup failed'));

    await expect(
      syncRecoveryAfterEnroll('totp', { verifyMfa }),
    ).rejects.toThrow('setup failed');
  });
});

describe('removePasskeyFromRecovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("builds the service with the caller's verifyMfa and the setup approval operation", async () => {
    createService();

    await removePasskeyFromRecovery('credential', { verifyMfa });

    expect(createMfaRecoveryService).toHaveBeenCalledWith({
      verifyMfa,
      approvalOperation: PASSWORDLESS_RECOVERY_SETUP_OPERATION,
    });
  });

  it('removes the enrolled passkey with the credential ID', async () => {
    const service = createService();

    await removePasskeyFromRecovery('credential', { verifyMfa });

    expect(service.findEnrolledPasskeyIdentifier).toHaveBeenCalledWith(
      'credential',
    );
    expect(service.removeIdentifier).toHaveBeenCalledWith(PASSKEY);
  });

  it('does nothing when recovery is not set up', async () => {
    const service = createService({ status: 'NotEnabled' });

    await removePasskeyFromRecovery('credential', { verifyMfa });

    expect(service.findEnrolledPasskeyIdentifier).not.toHaveBeenCalled();
    expect(service.removeIdentifier).not.toHaveBeenCalled();
  });

  it('does nothing when Cubist does not have the passkey', async () => {
    const service = createService({ enrolledPasskey: null });

    await removePasskeyFromRecovery('credential', { verifyMfa });

    expect(service.removeIdentifier).not.toHaveBeenCalled();
  });

  it('propagates removal failures to the caller', async () => {
    const service = createService();
    service.removeIdentifier.mockRejectedValue(new Error('remove failed'));

    await expect(
      removePasskeyFromRecovery('credential', { verifyMfa }),
    ).rejects.toThrow('remove failed');
  });
});

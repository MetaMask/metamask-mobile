import type { Identifier } from '@metamask/mfa-recovery-controller';
import type { MfaRecoveryService } from '../Engine/controllers/mfa-recovery-controller/services/mfa-recovery-service';
import { createMfaRecoveryService } from './engineBindings';
import { PASSWORDLESS_RECOVERY_SETUP_OPERATION } from './setupPasswordlessRecovery';
import { syncRecoveryAfterEnroll } from './syncRecoveryAfterEnroll';

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

function createService({
  status = 'Enabled',
  cubist = [] as Identifier[],
  candidates = {} as Partial<Record<string, Identifier>>,
}: {
  status?: 'Enabled' | 'NotEnabled';
  cubist?: Identifier[];
  candidates?: Partial<Record<string, Identifier>>;
} = {}) {
  const service = {
    getStatus: jest.fn().mockReturnValue(status),
    getCandidateIdentifiers: jest.fn().mockResolvedValue(candidates),
    setUp: jest.fn().mockResolvedValue('enabled'),
    addIdentifier: jest.fn().mockResolvedValue({}),
    hasEnrolledIdentifier: jest.fn(async (type: string) =>
      cubist.some((identifier) => identifier.type === type),
    ),
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

  it('adds a new passkey when recovery is set up and Cubist has none', async () => {
    const service = createService({
      cubist: [SIWE],
      candidates: { passkey: PASSKEY },
    });

    await syncRecoveryAfterEnroll('passkey', { verifyMfa });

    expect(service.addIdentifier).toHaveBeenCalledWith(PASSKEY);
    expect(service.setUp).not.toHaveBeenCalled();
  });

  it('does nothing when Cubist already has a passkey', async () => {
    const service = createService({
      cubist: [SIWE, PASSKEY],
      candidates: { passkey: PASSKEY },
    });

    await syncRecoveryAfterEnroll('passkey', { verifyMfa });

    expect(service.addIdentifier).not.toHaveBeenCalled();
    expect(service.setUp).not.toHaveBeenCalled();
  });

  it('does nothing for a non-passkey method once recovery is set up', async () => {
    const service = createService({
      cubist: [SIWE],
      candidates: { passkey: PASSKEY },
    });

    await syncRecoveryAfterEnroll('totp', { verifyMfa });

    expect(service.addIdentifier).not.toHaveBeenCalled();
    expect(service.setUp).not.toHaveBeenCalled();
  });

  it('does nothing when no passkey candidate is available', async () => {
    const service = createService({ cubist: [SIWE], candidates: {} });

    await syncRecoveryAfterEnroll('passkey', { verifyMfa });

    expect(service.addIdentifier).not.toHaveBeenCalled();
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

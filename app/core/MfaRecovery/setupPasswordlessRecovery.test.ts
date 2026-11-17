import type { Identifier } from '@metamask/mfa-recovery-controller';
import { MfaRecoveryControllerError } from '../Engine/controllers/mfa-recovery-controller/errors';
import {
  MfaRecoveryService,
  type MfaRecoveryRunIdentifiers,
} from '../Engine/controllers/mfa-recovery-controller/services/mfa-recovery-service';
import { LinkSocialLoginError } from '../Engine/controllers/mfa-recovery-controller/social-login/link-social-login';
import {
  PASSWORDLESS_RECOVERY_SETUP_OPERATION,
  PasswordlessRecoverySetupError,
  setupPasswordlessRecovery,
} from './setupPasswordlessRecovery';

jest.mock(
  '../Engine/controllers/mfa-recovery-controller/services/mfa-recovery-service',
  () => ({ MfaRecoveryService: jest.fn() }),
);

const PASSKEY: Identifier = {
  type: 'passkey',
  namespace: 'metamask.io',
  value: 'cred-1',
};

const SIWE: Identifier = {
  type: 'siwe',
  namespace: 'eip155',
  value: '0xabc',
};

const mockService = {
  getStatus: jest.fn(),
  prepareRun: jest.fn(),
  setUp: jest.fn(),
};

function runIdentifiers(
  passkey: () => Identifier = () => PASSKEY,
): MfaRecoveryRunIdentifiers {
  return {
    siweIdentifier: SIWE,
    get passkeyIdentifier(): Identifier {
      return passkey();
    },
  };
}

async function setupError(
  verifyMfa: () => Promise<void> = jest.fn(),
): Promise<unknown> {
  return await setupPasswordlessRecovery(verifyMfa).catch(
    (caught: unknown) => caught,
  );
}

describe('setupPasswordlessRecovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(MfaRecoveryService)
      .mockImplementation(() => mockService as unknown as MfaRecoveryService);
    mockService.getStatus.mockReturnValue('NotEnabled');
    mockService.prepareRun.mockResolvedValue(runIdentifiers());
    mockService.setUp.mockResolvedValue('enabled');
  });

  it('creates the service with the verifier and the setup operation', async () => {
    const verifyMfa = jest.fn(async () => undefined);

    await setupPasswordlessRecovery(verifyMfa);

    expect(MfaRecoveryService).toHaveBeenCalledWith({
      verifyMfa,
      approvalOperation: PASSWORDLESS_RECOVERY_SETUP_OPERATION,
    });
  });

  it('sets up recovery with the approved passkey', async () => {
    const result = await setupPasswordlessRecovery(jest.fn());

    expect(result).toBe('enabled');
    expect(mockService.prepareRun).toHaveBeenCalledTimes(1);
    expect(mockService.setUp).toHaveBeenCalledWith([PASSKEY]);
  });

  it('returns the service result when setUp finds the vault sealed', async () => {
    mockService.setUp.mockResolvedValue('already_enabled');

    await expect(setupPasswordlessRecovery(jest.fn())).resolves.toBe(
      'already_enabled',
    );
  });

  it('does nothing when recovery is already enabled', async () => {
    mockService.getStatus.mockReturnValue('Enabled');
    const verifyMfa = jest.fn(async () => undefined);

    const result = await setupPasswordlessRecovery(verifyMfa);

    expect(result).toBe('already_enabled');
    expect(verifyMfa).not.toHaveBeenCalled();
    expect(mockService.prepareRun).not.toHaveBeenCalled();
    expect(mockService.setUp).not.toHaveBeenCalled();
  });

  it('reports passkey_not_enrolled when Auth approved no passkey', async () => {
    mockService.prepareRun.mockResolvedValue(
      runIdentifiers(() => {
        throw new MfaRecoveryControllerError(
          'Auth has no approved passkey identifier for this profile',
          'identifier_not_approved',
        );
      }),
    );

    const error = await setupError();

    expect(error).toBeInstanceOf(PasswordlessRecoverySetupError);
    expect(error).toMatchObject({ code: 'passkey_not_enrolled' });
    expect(mockService.setUp).not.toHaveBeenCalled();
  });

  it('keeps the code and names the error the service threw', async () => {
    mockService.setUp.mockRejectedValue(
      new MfaRecoveryControllerError(
        'Auth has no approved social identifier for this login',
        'social_identifier_not_approved',
      ),
    );

    const error = await setupError();

    expect(error).toBeInstanceOf(PasswordlessRecoverySetupError);
    expect(error).toMatchObject({
      code: 'social_identifier_not_approved',
      detail:
        'MfaRecoveryControllerError: Auth has no approved social identifier for this login',
    });
  });

  it('keeps the reason Auth gave when linking the social login fails', async () => {
    mockService.setUp.mockRejectedValue(
      new LinkSocialLoginError('social_link_http_400', 'bad email'),
    );

    const error = await setupError();

    expect(error).toMatchObject({
      code: 'social_link_http_400',
      detail: 'bad email',
    });
  });

  it('redacts emails and tokens from the failure detail', async () => {
    const token = 'a'.repeat(32);
    mockService.setUp.mockRejectedValue(
      new Error(`seal failed for user@example.com with ${token}`),
    );

    const error = await setupError();

    expect(error).toMatchObject({
      code: 'unknown_error',
      detail: 'Error: seal failed for <email> with <redacted>',
    });
  });

  it('wraps verification failures with their code', async () => {
    mockService.prepareRun.mockRejectedValue(
      Object.assign(new Error('verify blew up'), { code: 'verify_failed' }),
    );

    const error = await setupError();

    expect(error).toBeInstanceOf(PasswordlessRecoverySetupError);
    expect(error).toMatchObject({
      code: 'verify_failed',
      detail: 'Error: verify blew up',
    });
  });

  it('names non-Error rejections by type', async () => {
    mockService.setUp.mockRejectedValue('boom');

    const error = await setupError();

    expect(error).toMatchObject({ code: 'unknown_error', detail: 'string' });
  });

  it('rethrows PasswordlessRecoverySetupError without wrapping', async () => {
    const setupFailure = new PasswordlessRecoverySetupError('custom_code');
    mockService.setUp.mockRejectedValue(setupFailure);

    await expect(setupPasswordlessRecovery(jest.fn())).rejects.toBe(
      setupFailure,
    );
  });
});

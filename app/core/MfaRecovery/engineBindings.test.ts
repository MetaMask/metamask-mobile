jest.mock(
  '../Engine/controllers/mfa-recovery-controller/services/mfa-recovery-service',
  () => ({
    MfaRecoveryService: jest.fn(),
  }),
);

import { MfaRecoveryService } from '../Engine/controllers/mfa-recovery-controller/services/mfa-recovery-service';
import {
  canProveSocialIdentifier,
  createPasswordlessRecoveryService,
} from './engineBindings';
import { PASSWORDLESS_RECOVERY_OPERATION } from './passwordlessSocialRecovery';

describe('canProveSocialIdentifier', () => {
  it('allows Google on iOS and Android', () => {
    expect(canProveSocialIdentifier('ios', 'google')).toBe(true);
    expect(canProveSocialIdentifier('android', 'google')).toBe(true);
  });

  it('rejects Google on an unsupported platform', () => {
    expect(canProveSocialIdentifier('web', 'google')).toBe(false);
  });

  it('allows Apple on iOS only', () => {
    expect(canProveSocialIdentifier('ios', 'apple')).toBe(true);
    expect(canProveSocialIdentifier('android', 'apple')).toBe(false);
  });

  it('rejects Telegram and a missing provider', () => {
    expect(canProveSocialIdentifier('ios', 'telegram')).toBe(false);
    expect(canProveSocialIdentifier('ios', undefined)).toBe(false);
    expect(canProveSocialIdentifier('android', undefined)).toBe(false);
  });
});

describe('createPasswordlessRecoveryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds the service for the passwordless recovery operation', () => {
    const service = createPasswordlessRecoveryService();

    expect(service).toBeInstanceOf(MfaRecoveryService);
    expect(MfaRecoveryService).toHaveBeenCalledWith({
      verifyMfa: expect.any(Function),
      approvalOperation: PASSWORDLESS_RECOVERY_OPERATION,
    });
  });

  it('gives the service a verification that does not prompt', async () => {
    createPasswordlessRecoveryService();
    const [{ verifyMfa }] = jest.mocked(MfaRecoveryService).mock.calls[0];

    await expect(verifyMfa()).resolves.toBeUndefined();
  });
});

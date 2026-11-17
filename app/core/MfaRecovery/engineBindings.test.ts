jest.mock('../Engine', () => ({
  context: {
    MfaRecoveryController: { name: 'MfaRecoveryController' },
    SeedlessOnboardingController: { name: 'SeedlessOnboardingController' },
    AuthenticationController: {
      requestMfaApproval: jest.fn(),
    },
  },
}));
jest.mock('react-native-quick-crypto', () => ({
  randomBytes: jest.fn((length: number) => Buffer.alloc(length, 7)),
}));
jest.mock('../Engine/controllers/mfa-recovery-controller/config', () => ({
  getToprfRecoveryConfig: jest.fn(() => ({
    aal2Audience: 'aal2',
    authConnectionId: 'auth',
    groupedAuthConnectionId: 'grouped',
  })),
}));

import QuickCrypto from 'react-native-quick-crypto';
import Engine from '../Engine';
import { getToprfRecoveryConfig } from '../Engine/controllers/mfa-recovery-controller/config';
import {
  canProveSocialIdentifier,
  createPasswordlessRecoveryDependencies,
} from './engineBindings';

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

describe('createPasswordlessRecoveryDependencies', () => {
  it('binds Engine controllers and TOPRF config', () => {
    const dependencies = createPasswordlessRecoveryDependencies();

    expect(dependencies.mfaRecovery).toBe(Engine.context.MfaRecoveryController);
    expect(dependencies.seedless).toBe(
      Engine.context.SeedlessOnboardingController,
    );
    expect(dependencies.toprf).toEqual({
      aal2Audience: 'aal2',
      authConnectionId: 'auth',
      groupedAuthConnectionId: 'grouped',
    });
    expect(getToprfRecoveryConfig).toHaveBeenCalledTimes(1);
  });

  it('forwards MFA approval requests to AuthenticationController', async () => {
    const request = { requestHash: '0x1' };
    jest
      .mocked(Engine.context.AuthenticationController.requestMfaApproval)
      .mockResolvedValue({ approval: 'token' } as never);

    const dependencies = createPasswordlessRecoveryDependencies();
    await dependencies.requestMfaApproval(request as never);

    expect(
      Engine.context.AuthenticationController.requestMfaApproval,
    ).toHaveBeenCalledWith(request);
  });

  it('fills random bytes through QuickCrypto', () => {
    const dependencies = createPasswordlessRecoveryDependencies();

    const bytes = dependencies.randomBytes(4);

    expect(QuickCrypto.randomBytes).toHaveBeenCalledWith(4);
    expect(bytes).toEqual(new Uint8Array([7, 7, 7, 7]));
  });
});

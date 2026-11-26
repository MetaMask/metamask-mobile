import type { EnrolledCredential } from '@metamask/profile-sync-controller/sdk';
import {
  getActiveTwoStepMethods,
  getChangePasswordGateKind,
} from './changePasswordGate';

const credential = (
  type: EnrolledCredential['type'],
  status: EnrolledCredential['status'] = 'active',
): EnrolledCredential =>
  ({
    type,
    status,
  }) as EnrolledCredential;

describe('getActiveTwoStepMethods', () => {
  it('returns active methods in cost order and skips inactive', () => {
    expect(
      getActiveTwoStepMethods([
        credential('email_otp'),
        credential('passkey'),
        credential('totp', 'pending'),
      ]),
    ).toEqual(['passkey', 'email_otp']);
  });

  it('returns empty when nothing is active', () => {
    expect(getActiveTwoStepMethods([credential('totp', 'pending')])).toEqual(
      [],
    );
  });
});

describe('getChangePasswordGateKind', () => {
  const withTwoStep = {
    isSeedlessLoginFlow: true,
    isMfaUiKitEnabled: true,
    activeTwoStepMethods: ['passkey'] as const,
  };

  it('returns legacy when not seedless', () => {
    expect(
      getChangePasswordGateKind({
        ...withTwoStep,
        isSeedlessLoginFlow: false,
        isLocalPassword: false,
      }),
    ).toBe('legacy');
  });

  it('returns legacy when MFA UI kit is off', () => {
    expect(
      getChangePasswordGateKind({
        ...withTwoStep,
        isMfaUiKitEnabled: false,
        isLocalPassword: false,
      }),
    ).toBe('legacy');
  });

  it('returns legacy when no 2SV methods are active', () => {
    expect(
      getChangePasswordGateKind({
        ...withTwoStep,
        activeTwoStepMethods: [],
        isLocalPassword: false,
      }),
    ).toBe('legacy');
  });

  it('returns password_device when vault password is global (Face ID alone)', () => {
    expect(
      getChangePasswordGateKind({
        ...withTwoStep,
        isLocalPassword: false,
      }),
    ).toBe('password_device');
  });

  it('returns recovery_device when vault password is recovery-local (2SV first)', () => {
    expect(
      getChangePasswordGateKind({
        ...withTwoStep,
        isLocalPassword: true,
      }),
    ).toBe('recovery_device');
  });
});

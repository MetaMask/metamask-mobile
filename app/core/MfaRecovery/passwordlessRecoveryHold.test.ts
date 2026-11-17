import type { Identifier } from '@metamask/mfa-recovery-controller';
import {
  clearPasswordlessRecoveryHold,
  hasPasswordlessRecoveryHold,
  setPasswordlessRecoveryHold,
  takePasswordlessRecoveryHold,
} from './passwordlessRecoveryHold';

const PASSKEY: Identifier = {
  type: 'passkey',
  namespace: 'metamask.io',
  value: 'cred-1',
};

describe('passwordlessRecoveryHold', () => {
  afterEach(() => {
    clearPasswordlessRecoveryHold();
  });

  it('stores and transfers ownership on take', () => {
    const secret = new Uint8Array([1, 2, 3]);
    setPasswordlessRecoveryHold(PASSKEY, secret);

    expect(hasPasswordlessRecoveryHold()).toBe(true);

    const held = takePasswordlessRecoveryHold();
    expect(held).toEqual({ identifier: PASSKEY, recoverySecret: secret });
    expect(hasPasswordlessRecoveryHold()).toBe(false);
    expect(takePasswordlessRecoveryHold()).toBeNull();
  });

  it('zeros the secret on clear', () => {
    const secret = new Uint8Array([9, 8, 7]);
    setPasswordlessRecoveryHold(PASSKEY, secret);
    clearPasswordlessRecoveryHold();

    expect(hasPasswordlessRecoveryHold()).toBe(false);
    expect(secret).toEqual(new Uint8Array([0, 0, 0]));
  });
});

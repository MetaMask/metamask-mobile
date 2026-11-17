import type { Identifier } from '@metamask/mfa-recovery-controller';
import {
  findSocialIdentifier,
  getMfaRecoveryStatus,
  getRegistrationIdentifiers,
} from './recovery-setup';

const SIWE_IDENTIFIER: Identifier = {
  type: 'siwe',
  namespace: 'metamask.io:1',
  value: '0xabc',
};
const AUTH_PASSKEY_IDENTIFIER: Identifier = {
  type: 'passkey',
  namespace: 'auth.example',
  value: 'auth-cred',
};
const AUTH_SIWE_IDENTIFIER: Identifier = {
  type: 'siwe',
  namespace: 'metamask.io:1',
  value: '0xdef',
};
const AUTH_SOCIAL_IDENTIFIER: Identifier = {
  type: 'social',
  namespace: 'https://accounts.google.com',
  value: 'auth-social',
};
const AUTH_APPLE_IDENTIFIER: Identifier = {
  type: 'social',
  namespace: 'https://appleid.apple.com',
  value: 'auth-apple',
};
const GOOGLE_LOGIN = { authConnection: 'google' };

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

describe('findSocialIdentifier', () => {
  it("returns Auth's social identifier for the login's issuer", () => {
    expect(
      findSocialIdentifier(
        [AUTH_APPLE_IDENTIFIER, AUTH_SOCIAL_IDENTIFIER],
        GOOGLE_LOGIN,
      ),
    ).toBe(AUTH_SOCIAL_IDENTIFIER);
  });

  it('returns undefined when only another issuer is approved', () => {
    expect(
      findSocialIdentifier([AUTH_APPLE_IDENTIFIER], GOOGLE_LOGIN),
    ).toBeUndefined();
  });

  it('returns undefined without a social login', () => {
    expect(findSocialIdentifier([AUTH_SOCIAL_IDENTIFIER], {})).toBeUndefined();
  });
});

describe('getRegistrationIdentifiers', () => {
  it("returns SIWE and Auth's social identifier without extra identifiers", () => {
    expect(
      getRegistrationIdentifiers(
        [AUTH_SIWE_IDENTIFIER, AUTH_PASSKEY_IDENTIFIER, AUTH_SOCIAL_IDENTIFIER],
        SIWE_IDENTIFIER,
        [],
        GOOGLE_LOGIN,
      ),
    ).toStrictEqual([SIWE_IDENTIFIER, AUTH_SOCIAL_IDENTIFIER]);
  });

  it('appends the given identifiers, skipping ones already in the list', () => {
    expect(
      getRegistrationIdentifiers(
        [AUTH_SOCIAL_IDENTIFIER],
        SIWE_IDENTIFIER,
        [AUTH_PASSKEY_IDENTIFIER, AUTH_SOCIAL_IDENTIFIER, SIWE_IDENTIFIER],
        GOOGLE_LOGIN,
      ),
    ).toStrictEqual([
      SIWE_IDENTIFIER,
      AUTH_SOCIAL_IDENTIFIER,
      AUTH_PASSKEY_IDENTIFIER,
    ]);
  });

  it('throws social_identifier_not_approved when Auth approved no social identifier for the login', () => {
    expect(() =>
      getRegistrationIdentifiers(
        [AUTH_PASSKEY_IDENTIFIER, AUTH_APPLE_IDENTIFIER],
        SIWE_IDENTIFIER,
        [],
        GOOGLE_LOGIN,
      ),
    ).toThrow(
      expect.objectContaining({
        code: 'social_identifier_not_approved',
        message: expect.stringContaining(
          'passkey@auth.example, social@https://appleid.apple.com',
        ),
      }),
    );
  });
});

import type { Identifier } from '@metamask/mfa-recovery-controller';
import { createSiweIdentifier } from '../auth/identifiers';
import {
  findMissingCubistIdentifier,
  getCandidateIdentifiers,
} from './recovery-identifiers';

const ADDRESS = '0xAbC';
const SIWE = createSiweIdentifier(ADDRESS);
const PASSKEY: Identifier = {
  type: 'passkey',
  namespace: 'auth.example',
  value: 'credential',
};
const AUTH_PASSKEY: Identifier = {
  ...PASSKEY,
  verifier: { rpId: 'auth.example' },
};
const SOCIAL: Identifier = {
  type: 'social',
  namespace: 'https://accounts.google.com',
  value: 'google-user',
};
const SEEDLESS_STATE = { authConnection: 'google', userId: 'google-user' };

describe('getCandidateIdentifiers', () => {
  it('uses Auth identifiers, the primary account for SIWE, and seedless for social', () => {
    expect(
      getCandidateIdentifiers([AUTH_PASSKEY], ADDRESS, SEEDLESS_STATE),
    ).toStrictEqual({ siwe: SIWE, passkey: AUTH_PASSKEY, social: SOCIAL });
  });

  it('leaves passkey and social undefined when nothing supplies them', () => {
    expect(getCandidateIdentifiers([], ADDRESS, {})).toStrictEqual({
      siwe: SIWE,
      passkey: undefined,
      social: undefined,
    });
  });
});

describe('findMissingCubistIdentifier', () => {
  const candidates = { siwe: SIWE, passkey: PASSKEY, social: SOCIAL };

  it('returns the first type not enrolled', () => {
    expect(findMissingCubistIdentifier([SIWE], candidates)).toStrictEqual({
      type: 'passkey',
      identifier: PASSKEY,
    });
  });

  it('skips a missing type that has no identifier to add', () => {
    expect(
      findMissingCubistIdentifier([SIWE], { siwe: SIWE, social: SOCIAL }),
    ).toStrictEqual({ type: 'social', identifier: SOCIAL });
  });

  it('returns the missing type without an identifier when none can be added', () => {
    expect(
      findMissingCubistIdentifier([SIWE, SOCIAL], { siwe: SIWE }),
    ).toStrictEqual({ type: 'passkey', identifier: undefined });
  });

  it('returns undefined when every type is enrolled', () => {
    expect(
      findMissingCubistIdentifier([SIWE, PASSKEY, SOCIAL], candidates),
    ).toBeUndefined();
  });
});

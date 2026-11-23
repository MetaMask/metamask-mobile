import { createSiweIdentifier, createSocialIdentifier } from './identifiers';

describe('createSiweIdentifier', () => {
  it('lowercases the address and namespaces it by SIWE domain and chain', () => {
    expect(createSiweIdentifier('0xAbCdEf')).toStrictEqual({
      type: 'siwe',
      namespace: 'metamask.io:1',
      value: '0xabcdef',
      verifier: { domain: 'metamask.io', chainId: 1 },
    });
  });
});

describe('createSocialIdentifier', () => {
  it('namespaces a Google login by the Google issuer', () => {
    expect(
      createSocialIdentifier({ authConnection: 'google', userId: 'user-1' }),
    ).toStrictEqual({
      type: 'social',
      namespace: 'https://accounts.google.com',
      value: 'user-1',
    });
  });

  it('namespaces an Apple login by the Apple issuer', () => {
    expect(
      createSocialIdentifier({ authConnection: 'apple', userId: 'user-2' }),
    ).toStrictEqual({
      type: 'social',
      namespace: 'https://appleid.apple.com',
      value: 'user-2',
    });
  });

  it.each([
    ['the provider', { userId: 'user-1' }],
    ['the user ID', { authConnection: 'google' }],
  ])('throws social_login_unavailable without %s', (_, state) => {
    expect(() => createSocialIdentifier(state)).toThrow(
      expect.objectContaining({ code: 'social_login_unavailable' }),
    );
  });

  it('throws unsupported_social_login for a provider without an issuer', () => {
    expect(() =>
      createSocialIdentifier({ authConnection: 'telegram', userId: 'user-3' }),
    ).toThrow(expect.objectContaining({ code: 'unsupported_social_login' }));
  });
});

import { emailFromPartnerIdentityToken } from './partnerIdentityEmail';

const partnerIdentityJwt = (payload: Record<string, unknown>): string => {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    'base64url',
  );
  return `header.${encodedPayload}.signature`;
};

describe('emailFromPartnerIdentityToken', () => {
  it('reads email from JWT ext.email', () => {
    const token = partnerIdentityJwt({
      ext: { email: '  user@example.com  ' },
    });

    expect(emailFromPartnerIdentityToken(token)).toBe('user@example.com');
  });

  it('reads email from JWT ext when ext is a string', () => {
    const token = partnerIdentityJwt({ ext: 'user@example.com' });

    expect(emailFromPartnerIdentityToken(token)).toBe('user@example.com');
  });

  it('reads top-level email when ext is absent', () => {
    const token = partnerIdentityJwt({ email: 'user@example.com' });

    expect(emailFromPartnerIdentityToken(token)).toBe('user@example.com');
  });

  it('returns undefined when the token has no email claim', () => {
    const token = partnerIdentityJwt({ sub: 'profile-id' });

    expect(emailFromPartnerIdentityToken(token)).toBeUndefined();
  });

  it('returns undefined for a malformed token', () => {
    expect(emailFromPartnerIdentityToken('not-a-jwt')).toBeUndefined();
  });
});

import {
  buildVenueAuthorization,
  VENUE_AUTHORIZATION_VERSION,
} from './venueAuthorization';

const signature = {
  requestId: 'a1b2c3d4-1111-4222-8333-444455556666',
  signatureInput: 'kalshi=(...)',
  signature: 'kalshi=:AAAA:',
};
const context = { a2t: 'a.b.c', deviceKey: 'key', salt: 'salt' };

const decode = (value: string) =>
  JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown;

describe('buildVenueAuthorization', () => {
  it('encodes version, profile, step, credential and signatures as unpadded base64url', () => {
    const value = buildVenueAuthorization({
      signingProfileId: 'kalshi-demo-signing-v2',
      step: 'default',
      context,
      signatures: [signature],
      maxSignatures: 4,
    });

    expect(value).toMatch(/^[A-Za-z0-9_-]+$/u);
    expect(decode(value)).toEqual({
      v: VENUE_AUTHORIZATION_VERSION,
      signingProfileId: 'kalshi-demo-signing-v2',
      step: 'default',
      credential: context,
      values: {},
      signatures: [signature],
    });
  });

  it('allows an empty signature list and refuses more than the profile allows', () => {
    const build = (count: number) =>
      buildVenueAuthorization({
        signingProfileId: 'p',
        step: 'none',
        context,
        signatures: Array.from({ length: count }, () => signature),
        maxSignatures: 2,
      });

    expect(decode(build(0))).toMatchObject({ signatures: [] });
    expect(() => build(3)).toThrow('at most 2');
    expect(() => build(2)).not.toThrow();
  });
});

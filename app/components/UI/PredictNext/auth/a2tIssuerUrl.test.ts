import { resolveA2tIssuerUrl } from './a2tIssuerUrl';

describe('resolveA2tIssuerUrl', () => {
  it('returns an https issuer and strips a trailing slash', () => {
    expect(
      resolveA2tIssuerUrl('https://predict-api.dev-api.cx.metamask.io/'),
    ).toBe('https://predict-api.dev-api.cx.metamask.io');
  });

  it('rejects a non-https URL', () => {
    expect(() => resolveA2tIssuerUrl('http://localhost:3333')).toThrow(
      'MM_A2T_URL must be https',
    );
  });

  it('rejects a value that is not a URL', () => {
    expect(() => resolveA2tIssuerUrl('not a url')).toThrow(
      'MM_A2T_URL is not a URL',
    );
  });

  it('returns undefined when the URL is missing', () => {
    expect(resolveA2tIssuerUrl('  ')).toBe(undefined);
    expect(resolveA2tIssuerUrl(undefined)).toBe(undefined);
  });
});

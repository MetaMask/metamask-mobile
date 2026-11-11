import { summarizeA2t } from './kalshiDebugInfo';

const tokenWith = (claims: Record<string, unknown>) => {
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `header.${payload}.sig`;
};

describe('summarizeA2t', () => {
  it('returns an empty summary when the token is missing', () => {
    expect(summarizeA2t(undefined)).toEqual({});
  });

  it('returns an empty summary when the token has no payload', () => {
    expect(summarizeA2t('header-only')).toEqual({});
    expect(summarizeA2t('header.')).toEqual({});
  });

  it('returns an empty summary when the payload is not json', () => {
    const payload = Buffer.from('not-json').toString('base64url');

    expect(summarizeA2t(`header.${payload}.sig`)).toEqual({});
  });

  it('returns the subject, audience, issuer and expiry from the claims', () => {
    const summary = summarizeA2t(
      tokenWith({
        sub: 'user-1',
        aud: 'predict',
        iss: 'predict-api',
        exp: 1_700_000_000,
      }),
    );

    expect(summary).toEqual({
      sub: 'user-1',
      aud: 'predict',
      iss: 'predict-api',
      expiresAt: '2023-11-14T22:13:20.000Z',
    });
  });

  it('omits claims that are not strings and an exp that is not a number', () => {
    const summary = summarizeA2t(
      tokenWith({
        sub: 1,
        aud: null,
        iss: { id: 'nope' },
        exp: 'soon',
      }),
    );

    expect(summary).toEqual({
      sub: undefined,
      aud: undefined,
      iss: undefined,
      expiresAt: undefined,
    });
  });
});

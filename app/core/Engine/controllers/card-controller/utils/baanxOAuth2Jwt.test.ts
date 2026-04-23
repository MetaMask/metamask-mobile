import {
  cardLocationFromBaanxAccessToken,
  decodeJwtPayloadUnsafe,
  hasUnknownBaanxOAuthAppId,
} from './baanxOAuth2Jwt';

interface BufferFromUtf8 {
  from(
    data: string,
    encoding: 'utf8',
  ): { toString(encoding: 'base64'): string };
}

function base64UrlEncodeUtf8(input: string): string {
  const BufferCtor = (globalThis as { Buffer?: BufferFromUtf8 }).Buffer;
  if (!BufferCtor) {
    throw new Error('Buffer is not available in this test environment');
  }
  return BufferCtor.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/[=]/g, '');
}

function buildUnsignedJwt(payload: Record<string, unknown>): string {
  const header = base64UrlEncodeUtf8(JSON.stringify({ alg: 'none' }));
  const body = base64UrlEncodeUtf8(JSON.stringify(payload));

  return `${header}.${body}.signature`;
}

describe('decodeJwtPayloadUnsafe', () => {
  it('returns parsed payload for a well-formed JWT', () => {
    const jwt = buildUnsignedJwt({ app_id: 'FOX', sub: 'user-1' });

    const result = decodeJwtPayloadUnsafe(jwt);

    expect(result).toEqual({ app_id: 'FOX', sub: 'user-1' });
  });

  it('returns null when the token has fewer than two segments', () => {
    const result = decodeJwtPayloadUnsafe('not-a-jwt');

    expect(result).toBeNull();
  });

  it('returns null when the payload segment is not valid base64 JSON', () => {
    const result = decodeJwtPayloadUnsafe('aaa.b!!!.sig');

    expect(result).toBeNull();
  });
});

describe('cardLocationFromBaanxAccessToken', () => {
  it('returns us when app_id is FOX_US', () => {
    const token = buildUnsignedJwt({ app_id: 'FOX_US' });

    const result = cardLocationFromBaanxAccessToken(token);

    expect(result).toBe('us');
  });

  it('returns international when app_id is FOX', () => {
    const token = buildUnsignedJwt({ app_id: 'FOX' });

    const result = cardLocationFromBaanxAccessToken(token);

    expect(result).toBe('international');
  });

  it('returns null when app_id is missing', () => {
    const token = buildUnsignedJwt({ sub: 'x' });

    const result = cardLocationFromBaanxAccessToken(token);

    expect(result).toBeNull();
  });

  it('returns null when app_id is an unknown string', () => {
    const token = buildUnsignedJwt({ app_id: 'OTHER' });

    const result = cardLocationFromBaanxAccessToken(token);

    expect(result).toBeNull();
  });

  it('returns null for a malformed JWT string', () => {
    const result = cardLocationFromBaanxAccessToken('x.y.z');

    expect(result).toBeNull();
  });
});

describe('hasUnknownBaanxOAuthAppId', () => {
  it('returns false when app_id is FOX', () => {
    const token = buildUnsignedJwt({ app_id: 'FOX' });

    expect(hasUnknownBaanxOAuthAppId(token)).toBe(false);
  });

  it('returns false when app_id is FOX_US', () => {
    const token = buildUnsignedJwt({ app_id: 'FOX_US' });

    expect(hasUnknownBaanxOAuthAppId(token)).toBe(false);
  });

  it('returns true when app_id is present but not FOX or FOX_US', () => {
    const token = buildUnsignedJwt({ app_id: 'OTHER' });

    expect(hasUnknownBaanxOAuthAppId(token)).toBe(true);
  });

  it('returns false when app_id is absent', () => {
    const token = buildUnsignedJwt({ sub: 'x' });

    expect(hasUnknownBaanxOAuthAppId(token)).toBe(false);
  });
});

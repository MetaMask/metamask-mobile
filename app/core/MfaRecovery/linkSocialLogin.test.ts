import { keccak_256 as keccak256 } from '@noble/hashes/sha3';
import { Env } from '@metamask/profile-sync-controller/sdk';
import { bytesToHex } from '@metamask/utils';
import { LinkSocialLoginError, linkSocialLogin } from './linkSocialLogin';

const encode = (value: object): string =>
  Buffer.from(JSON.stringify(value))
    .toString('base64')
    .replace(/\+/gu, '-')
    .replace(/\//gu, '_')
    .replace(/[=]+$/u, '');

const socialJwt = (claims: object): string =>
  `header.${encode(claims)}.signature`;

const okResponse = { ok: true, status: 200 } as Response;

function createDependencies(
  overrides: Partial<Parameters<typeof linkSocialLogin>[0]> = {},
): Parameters<typeof linkSocialLogin>[0] & { fetchFn: jest.Mock } {
  return {
    env: Env.DEV,
    seedlessState: {
      vault: 'vault',
      authConnection: 'google',
      socialLoginEmail: 'state@example.com',
    },
    getSocialAccessToken: jest.fn(async () =>
      socialJwt({ email: 'token@example.com' }),
    ),
    getVerifiedAccessToken: jest.fn(() => 'verified-token'),
    fetchFn: jest.fn(async () => okResponse),
    ...overrides,
  } as Parameters<typeof linkSocialLogin>[0] & { fetchFn: jest.Mock };
}

const readBody = (fetchFn: jest.Mock): Record<string, unknown> =>
  JSON.parse(fetchFn.mock.calls[0][1].body as string);

describe('linkSocialLogin', () => {
  it('links Google with the email claim and the verified token', async () => {
    const dependencies = createDependencies();

    await linkSocialLogin(dependencies);

    const [url, init] = dependencies.fetchFn.mock.calls[0];
    expect(String(url)).toContain('/api/v2/profile/pair/identifier');
    expect(init.headers.Authorization).toBe('Bearer verified-token');
    expect(readBody(dependencies.fetchFn)).toMatchObject({
      identifier_type: 'GOOGLE',
      email: 'token@example.com',
    });
  });

  it('falls back to the stored email when the token has none', async () => {
    const dependencies = createDependencies({
      getSocialAccessToken: jest.fn(async () => socialJwt({})),
    });

    await linkSocialLogin(dependencies);

    expect(readBody(dependencies.fetchFn)).toMatchObject({
      email: 'state@example.com',
    });
  });

  it('sends the email whose hash is the token subject', async () => {
    const sub = bytesToHex(
      keccak256(new TextEncoder().encode('state@example.com')),
    ).slice(2);
    const dependencies = createDependencies({
      getSocialAccessToken: jest.fn(async () =>
        socialJwt({ email: 'token@example.com', sub }),
      ),
    });

    await linkSocialLogin(dependencies);

    expect(readBody(dependencies.fetchFn)).toMatchObject({
      email: 'state@example.com',
    });
  });

  it('matches the subject ignoring case and a 0x prefix', async () => {
    const sub = `0x${bytesToHex(
      keccak256(new TextEncoder().encode('token@example.com')),
    )
      .slice(2)
      .toUpperCase()}`;
    const dependencies = createDependencies({
      getSocialAccessToken: jest.fn(async () =>
        socialJwt({ email: 'Token@Example.com', sub }),
      ),
    });

    await linkSocialLogin(dependencies);

    expect(readBody(dependencies.fetchFn)).toMatchObject({
      email: 'Token@Example.com',
    });
  });

  it('links Apple without requiring an email', async () => {
    const dependencies = createDependencies({
      seedlessState: { vault: 'vault', authConnection: 'apple' },
      getSocialAccessToken: jest.fn(async () => socialJwt({})),
    });

    await linkSocialLogin(dependencies);

    const body = readBody(dependencies.fetchFn);
    expect(body.identifier_type).toBe('APPLE');
    expect(body).not.toHaveProperty('email');
  });

  it.each([
    [
      'no vault',
      { seedlessState: { authConnection: 'google' } },
      'social_login_unavailable',
    ],
    [
      'an unsupported provider',
      { seedlessState: { vault: 'vault', authConnection: 'telegram' } },
      'social_login_unavailable',
    ],
    [
      'no social token',
      { getSocialAccessToken: jest.fn(async () => undefined) },
      'social_token_unavailable',
    ],
    [
      'no verified token',
      { getVerifiedAccessToken: jest.fn(() => undefined) },
      'verification_token_unavailable',
    ],
    [
      'no Google email',
      {
        seedlessState: { vault: 'vault', authConnection: 'google' },
        getSocialAccessToken: jest.fn(async () => socialJwt({})),
      },
      'social_email_unavailable',
    ],
  ])('rejects with %s before calling Auth', async (_name, overrides, code) => {
    const dependencies = createDependencies(overrides);

    const error = await linkSocialLogin(dependencies).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(LinkSocialLoginError);
    expect(error).toMatchObject({ code });
    expect(dependencies.fetchFn).not.toHaveBeenCalled();
  });

  it('reports a login owned by another profile', async () => {
    const dependencies = createDependencies({
      fetchFn: jest.fn(async () => ({ ok: false, status: 409 }) as Response),
    });

    await expect(linkSocialLogin(dependencies)).rejects.toMatchObject({
      code: 'social_linked_to_other_profile',
    });
  });

  it('reports an HTTP failure with Auth reason, emails and tokens removed', async () => {
    const dependencies = createDependencies({
      getSocialAccessToken: jest.fn(async () =>
        socialJwt({ email: 'token@example.com', sub: 'abc' }),
      ),
      fetchFn: jest.fn(
        async () =>
          ({
            ok: false,
            status: 400,
            text: async () =>
              JSON.stringify({
                message:
                  'email token@example.com does not match AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
              }),
          }) as Response,
      ),
    });

    const error = await linkSocialLogin(dependencies).catch(
      (caught: unknown) => caught,
    );

    expect(error).toMatchObject({ code: 'social_link_http_400' });
    const { detail } = error as LinkSocialLoginError;
    expect(detail).toContain('email <email> does not match <redacted>');
    expect(detail).toContain('email matches token subject: false');
    expect(detail).not.toContain('token@example.com');
  });

  it('reports a missing reason when the response cannot be read', async () => {
    const dependencies = createDependencies({
      fetchFn: jest.fn(async () => ({ ok: false, status: 400 }) as Response),
    });

    await expect(linkSocialLogin(dependencies)).rejects.toMatchObject({
      code: 'social_link_http_400',
      detail: 'no reason given (token has no subject)',
    });
  });
});

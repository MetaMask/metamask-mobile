import { Env, getEnvUrls } from '@metamask/profile-sync-controller/sdk';
import {
  linkSocialLogin,
  findEmailVariantMatchingSub,
  normalizeGoogleIdentifier,
  type LinkSocialLoginDependencies,
} from './linkSocialLogin';

const USER_EMAIL_IDENTIFIER =
  'cfb15ca7270395d72219fd758f75a0c95e3f0a61d959222402f24051d08e9b32';

const GOOGLE_STATE = {
  vault: 'vault',
  authConnection: 'google',
  socialLoginEmail: 'user@example.com',
};

const NO_CLAIMS_EMAIL = {
  emailSource: 'seedless',
  tokenClaimKeys: [],
  seedlessEmailMatchesToken: null,
  seedlessEmailMatchesTokenIgnoringCase: null,
};

function createJwt(claims: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify(claims))
    .toString('base64')
    .replace(/\+/gu, '-')
    .replace(/\//gu, '_')
    .replace(/[=]+$/u, '');
  return `header.${payload}.signature`;
}

function createResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

function createDependencies(
  overrides: Partial<LinkSocialLoginDependencies> = {},
): LinkSocialLoginDependencies & { fetchFn: jest.Mock } {
  return {
    env: Env.DEV,
    seedlessState: GOOGLE_STATE,
    getSocialAccessToken: jest.fn().mockResolvedValue('social-jwt'),
    getBearerToken: jest.fn().mockResolvedValue('bearer-token'),
    fetchFn: jest.fn().mockResolvedValue(
      createResponse(200, {
        profile: {
          paired_identifier_ids: [
            { id: 'srp-id', type: 'SRP' },
            { id: 'google-id', type: 'GOOGLE' },
          ],
        },
      }),
    ),
    ...overrides,
  } as LinkSocialLoginDependencies & { fetchFn: jest.Mock };
}

function getRequestBody(fetchFn: jest.Mock): unknown {
  return JSON.parse(fetchFn.mock.calls[0][1].body);
}

describe('normalizeGoogleIdentifier', () => {
  it('hashes the trimmed, lowercased email with keccak256 as unprefixed hex', () => {
    expect(normalizeGoogleIdentifier(' User@Example.com ')).toBe(
      USER_EMAIL_IDENTIFIER,
    );
  });
});

describe('findEmailVariantMatchingSub', () => {
  it('names the lowercase variant when sub hashes the lowercased email', () => {
    expect(
      findEmailVariantMatchingSub(USER_EMAIL_IDENTIFIER, 'User@Example.com'),
    ).toBe('lowercase');
  });

  it('names the Gmail variant without dots', () => {
    expect(
      findEmailVariantMatchingSub(
        normalizeGoogleIdentifier('firstlast@gmail.com'),
        'first.last@gmail.com',
      ),
    ).toBe('gmail_without_dots');
  });

  it('returns null when no variant matches', () => {
    expect(
      findEmailVariantMatchingSub('0'.repeat(64), 'user@example.com'),
    ).toBeNull();
  });
});

describe('linkSocialLogin', () => {
  it('reports that the token sub matches the normalized email', async () => {
    const dependencies = createDependencies({
      getSocialAccessToken: jest
        .fn()
        .mockResolvedValue(
          createJwt({ sub: USER_EMAIL_IDENTIFIER, email: 'user@example.com' }),
        ),
    });

    const result = await linkSocialLogin(dependencies);

    expect(result.token).toStrictEqual(
      expect.objectContaining({
        subLength: 64,
        subHas0xPrefix: false,
        subMatchesNormalizedEmail: true,
        subMatchesNormalizedEmailWith0x: false,
      }),
    );
  });

  it('posts the social JWT and email with the primary SRP bearer token', async () => {
    const dependencies = createDependencies();

    const result = await linkSocialLogin(dependencies);

    expect(result).toStrictEqual({
      status: 'linked',
      httpStatus: 200,
      pairedIdentifierTypes: ['SRP', 'GOOGLE'],
      email: NO_CLAIMS_EMAIL,
      token: expect.any(Object),
    });
    expect(dependencies.fetchFn).toHaveBeenCalledWith(
      `${getEnvUrls(Env.DEV).authApiUrl}/api/v2/profile/pair/identifier`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer bearer-token',
        },
        body: JSON.stringify({
          identifier_type: 'GOOGLE',
          social_jwt: 'social-jwt',
          email: 'user@example.com',
        }),
      },
    );
  });

  it('sends the email claim from the social token instead of the seedless email', async () => {
    const dependencies = createDependencies({
      getSocialAccessToken: jest
        .fn()
        .mockResolvedValue(
          createJwt({ sub: 'google-user', email: 'User@Example.com' }),
        ),
    });

    const result = await linkSocialLogin(dependencies);

    expect(getRequestBody(dependencies.fetchFn)).toStrictEqual(
      expect.objectContaining({ email: 'User@Example.com' }),
    );
    expect(result.email).toStrictEqual({
      emailSource: 'token',
      tokenClaimKeys: ['sub', 'email'],
      seedlessEmailMatchesToken: false,
      seedlessEmailMatchesTokenIgnoringCase: true,
    });
  });

  it('reports the social token issuer, audience, env, expiry, and subject match', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    const dependencies = createDependencies({
      seedlessState: { ...GOOGLE_STATE, userId: 'google-user' },
      getSocialAccessToken: jest.fn().mockResolvedValue(
        createJwt({
          sub: 'google-user',
          iss: 'issuer',
          aud: 'audience',
          env: 'dev',
          client_id: 'client',
          exp: 1_300,
        }),
      ),
    });

    const result = await linkSocialLogin(dependencies);

    expect(result.token).toStrictEqual({
      authApiUrl: getEnvUrls(Env.DEV).authApiUrl,
      iss: 'issuer',
      aud: 'audience',
      env: 'dev',
      clientId: 'client',
      secondsUntilExpiry: 300,
      subMatchesSeedlessUserId: true,
      subLength: 11,
      subHas0xPrefix: false,
      subMatchesNormalizedEmail: false,
      subMatchesNormalizedEmailWith0x: false,
      subHash: 'google-user',
      normalizedEmailHash: USER_EMAIL_IDENTIFIER,
      subMatchesEmailVariant: null,
    });
    jest.mocked(Date.now).mockRestore();
  });

  it('omits the email for Telegram', async () => {
    const dependencies = createDependencies({
      seedlessState: {
        vault: 'vault',
        authConnection: 'telegram',
        socialLoginEmail: 'Display Name',
      },
    });

    await linkSocialLogin(dependencies);

    expect(getRequestBody(dependencies.fetchFn)).toStrictEqual({
      identifier_type: 'TELEGRAM',
      social_jwt: 'social-jwt',
    });
  });

  it('returns no_social_login without a vault or a known provider', async () => {
    const dependencies = createDependencies({
      seedlessState: { authConnection: 'google' },
    });

    const result = await linkSocialLogin(dependencies);

    expect(result).toStrictEqual({ status: 'no_social_login' });
    expect(dependencies.fetchFn).not.toHaveBeenCalled();
  });

  it('returns missing_email for Google without an email in seedless or the token', async () => {
    const dependencies = createDependencies({
      seedlessState: { vault: 'vault', authConnection: 'google' },
    });

    const result = await linkSocialLogin(dependencies);

    expect(result).toStrictEqual({
      status: 'missing_email',
      email: { ...NO_CLAIMS_EMAIL, emailSource: 'none' },
      token: expect.any(Object),
    });
    expect(dependencies.fetchFn).not.toHaveBeenCalled();
  });

  it('returns missing_social_token when seedless has no access token', async () => {
    const dependencies = createDependencies({
      getSocialAccessToken: jest.fn().mockResolvedValue(undefined),
    });

    const result = await linkSocialLogin(dependencies);

    expect(result).toStrictEqual({ status: 'missing_social_token' });
    expect(dependencies.fetchFn).not.toHaveBeenCalled();
  });

  it('returns linked_to_other_profile on a 409 conflict', async () => {
    const dependencies = createDependencies({
      fetchFn: jest
        .fn()
        .mockResolvedValue(createResponse(409, { error: 'conflict' })),
    });

    const result = await linkSocialLogin(dependencies);

    expect(result).toStrictEqual({
      status: 'linked_to_other_profile',
      httpStatus: 409,
      detail: '{"error":"conflict"}',
      email: NO_CLAIMS_EMAIL,
      token: expect.any(Object),
    });
  });

  it('returns failed with the HTTP status for other errors', async () => {
    const dependencies = createDependencies({
      fetchFn: jest
        .fn()
        .mockResolvedValue(createResponse(400, { error: 'bad_request' })),
    });

    const result = await linkSocialLogin(dependencies);

    expect(result).toStrictEqual({
      status: 'failed',
      httpStatus: 400,
      detail: '{"error":"bad_request"}',
      email: NO_CLAIMS_EMAIL,
      token: expect.any(Object),
    });
  });
});

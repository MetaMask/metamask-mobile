import Engine from '../../../core/Engine';
import { profileSyncEnv } from '../../../core/OAuthService/OAuthLoginHandlers/constants';
import {
  getEnvUrls,
  getMfaErrorCode,
} from '@metamask/profile-sync-controller/sdk';
import {
  establishSocialProfileSession,
  listEnrolledCredentialsWithAccessToken,
  listEnrolledCredentialsWithSocialSession,
  mapApiCredentialToEnrolled,
} from './socialProfileSession';

jest.mock('../../../core/Engine', () => ({
  context: {
    AuthenticationController: {
      exchangeSocialAccessToken: jest.fn(),
    },
  },
}));

jest.mock('../../../core/OAuthService/OAuthLoginHandlers/constants', () => ({
  profileSyncEnv: 'dev',
}));

jest.mock('@metamask/profile-sync-controller/sdk', () => {
  const actual = jest.requireActual('@metamask/profile-sync-controller/sdk');
  return {
    ...actual,
    getEnvUrls: jest.fn(() => ({
      authApiUrl: 'https://auth.example.com',
    })),
  };
});

const authController = jest.mocked(Engine.context.AuthenticationController);

describe('mapApiCredentialToEnrolled', () => {
  it('maps passkey, email_otp, and totp rows', () => {
    expect(
      mapApiCredentialToEnrolled({
        credential_id: 'pk-1',
        credential_type: 'passkey',
        status: 'active',
        passkey: { display_name: 'iPhone' },
      }),
    ).toMatchObject({
      id: 'pk-1',
      type: 'passkey',
      displayName: 'iPhone',
      status: 'active',
    });

    expect(
      mapApiCredentialToEnrolled({
        credential_id: 'email',
        credential_type: 'email_otp',
        status: 'active',
        email: { address: 'a@b.co', verified: true },
      }),
    ).toMatchObject({
      id: 'email',
      type: 'email_otp',
      email: 'a@b.co',
      verified: true,
    });

    expect(
      mapApiCredentialToEnrolled({
        credential_id: 'totp',
        credential_type: 'totp',
        status: 'pending',
      }),
    ).toMatchObject({ id: 'totp', type: 'totp', status: 'pending' });
  });

  it('drops unsupported types and statuses', () => {
    expect(
      mapApiCredentialToEnrolled({
        credential_id: 'x',
        credential_type: 'sms',
        status: 'active',
      }),
    ).toBeUndefined();
    expect(
      mapApiCredentialToEnrolled({
        credential_id: 'x',
        credential_type: 'passkey',
        status: 'revoked',
      }),
    ).toBeUndefined();
  });
});

describe('establishSocialProfileSession', () => {
  it('maps exchangeSocialAccessToken into a social profile session', async () => {
    authController.exchangeSocialAccessToken.mockResolvedValue({
      token: {
        accessToken: 'profile-jwt',
        expiresIn: 3600,
        obtainedAt: 1000,
      },
      profile: {
        identifierId: 'id',
        profileId: 'profile-1',
        canonicalProfileId: 'canonical-1',
        metaMetricsId: 'mm',
      },
    });

    await expect(establishSocialProfileSession()).resolves.toStrictEqual({
      accessToken: 'profile-jwt',
      expiresIn: 3600,
      obtainedAt: 1000,
      profileId: 'profile-1',
    });
  });
});

describe('listEnrolledCredentialsWithAccessToken', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('GETs /api/v2/mfa/credentials with the bearer token', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        credentials: [
          {
            credential_id: 'pk-1',
            credential_type: 'passkey',
            status: 'active',
          },
        ],
      }),
    });

    const result = await listEnrolledCredentialsWithAccessToken('profile-jwt');

    expect(getEnvUrls).toHaveBeenCalledWith(profileSyncEnv);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://auth.example.com/api/v2/mfa/credentials',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer profile-jwt',
        }),
      }),
    );
    expect(result).toStrictEqual([
      { id: 'pk-1', type: 'passkey', status: 'active' },
    ]);
  });

  it('maps 401 to authentication_required', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401 });

    await expect(
      listEnrolledCredentialsWithAccessToken('bad').catch(getMfaErrorCode),
    ).resolves.toBe('authentication_required');
  });
});

describe('listEnrolledCredentialsWithSocialSession', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    authController.exchangeSocialAccessToken.mockResolvedValue({
      token: {
        accessToken: 'profile-jwt',
        expiresIn: 3600,
        obtainedAt: 1000,
      },
      profile: {
        identifierId: 'id',
        profileId: 'profile-1',
        canonicalProfileId: 'canonical-1',
        metaMetricsId: 'mm',
      },
    });
  });

  it('exchanges the social session then lists credentials', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        credentials: [
          {
            credential_id: 'totp',
            credential_type: 'totp',
            status: 'active',
          },
        ],
      }),
    });

    await expect(listEnrolledCredentialsWithSocialSession()).resolves.toEqual([
      { id: 'totp', type: 'totp', status: 'active' },
    ]);
    expect(authController.exchangeSocialAccessToken).toHaveBeenCalled();
  });
});

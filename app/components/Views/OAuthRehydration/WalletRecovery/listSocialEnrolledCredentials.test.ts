import Engine from '../../../../core/Engine';
import { profileSyncEnv } from '../../../../core/OAuthService/OAuthLoginHandlers/constants';
import { getEnvUrls } from '@metamask/profile-sync-controller/sdk';
import {
  listSocialEnrolledCredentials,
  mapApiCredentialToEnrolled,
  socialRecoveryMethodFlags,
} from './listSocialEnrolledCredentials';

jest.mock('../../../../core/Engine', () => ({
  context: {
    AuthenticationController: {
      exchangeSocialAccessToken: jest.fn(),
    },
    SeedlessOnboardingController: {
      state: { authConnection: 'google', vault: 'encrypted-vault' },
    },
  },
}));

jest.mock('../../../../core/OAuthService/OAuthLoginHandlers/constants', () => ({
  profileSyncEnv: 'dev',
}));

jest.mock('@metamask/profile-sync-controller/sdk', () => {
  const actual = jest.requireActual('@metamask/profile-sync-controller/sdk');
  return {
    ...actual,
    getEnvUrls: jest.fn(() => ({
      authApiUrl: 'https://auth.example.com',
      oidcApiUrl: 'https://oidc.example.com',
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

describe('socialRecoveryMethodFlags', () => {
  it('enables only active enrolled methods', () => {
    expect(
      socialRecoveryMethodFlags([
        { id: 'pk', type: 'passkey', status: 'active' },
        { id: 'email', type: 'email_otp', status: 'pending' },
        { id: 'totp', type: 'totp', status: 'active' },
      ]),
    ).toStrictEqual({
      showPasskey: true,
      showEmail: false,
      showTotp: true,
    });
  });
});

describe('listSocialEnrolledCredentials', () => {
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

  it('uses exchangeSocialAccessToken then GETs MFA credentials with that bearer', async () => {
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

    await expect(listSocialEnrolledCredentials()).resolves.toStrictEqual([
      { id: 'pk-1', type: 'passkey', status: 'active' },
    ]);
    expect(authController.exchangeSocialAccessToken).toHaveBeenCalled();
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
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/social/login'),
      expect.anything(),
    );
  });

  it('surfaces exchangeSocialAccessToken failures without calling social/login', async () => {
    authController.exchangeSocialAccessToken.mockRejectedValue(
      new Error('exchangeSocialAccessToken - the wallet has no social login'),
    );

    await expect(listSocialEnrolledCredentials()).rejects.toThrow(
      'the wallet has no social login',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

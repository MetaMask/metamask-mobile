import { Platform } from 'react-native';
import OAuthService from './OAuthService';
import { AuthConnection } from './OAuthInterface';
import { createLoginHandler } from './OAuthLoginHandlers';

const mockSeedlessState: { authConnection?: string } = {
  authConnection: 'google',
};

jest.mock('../Engine', () => ({
  __esModule: true,
  default: {
    context: {
      SeedlessOnboardingController: {
        get state() {
          return mockSeedlessState;
        },
      },
    },
  },
}));

jest.mock('./OAuthLoginHandlers', () => ({
  createLoginHandler: jest.fn(),
}));

jest.mock('../../util/analytics/whenEngineReady', () => ({
  whenEngineReady: jest.fn().mockResolvedValue(undefined),
}));

const NONCE = 'expected-nonce';
const PROVIDER_TOKEN = 'provider-id-token';

const buildHandler = (nonceClaim: string) => ({
  getProviderIdToken: jest.fn().mockResolvedValue(PROVIDER_TOKEN),
  decodeIdToken: jest
    .fn()
    .mockReturnValue(JSON.stringify({ nonce: nonceClaim, sub: 'user-sub' })),
});

describe('OAuthService.getSocialIdTokenForNonce', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSeedlessState.authConnection = 'google';
  });

  it('returns the provider ID token for the seedless Google connection', async () => {
    const handler = buildHandler(NONCE);
    (createLoginHandler as jest.Mock).mockReturnValue(handler);

    const token = await OAuthService.getSocialIdTokenForNonce(NONCE);

    expect(createLoginHandler).toHaveBeenCalledWith(
      Platform.OS,
      AuthConnection.Google,
      false,
      { nonce: NONCE },
    );
    expect(handler.getProviderIdToken).toHaveBeenCalledTimes(1);
    expect(token).toBe(PROVIDER_TOKEN);
  });

  it('uses the seedless Apple connection when that is the social login', async () => {
    mockSeedlessState.authConnection = 'apple';
    (createLoginHandler as jest.Mock).mockReturnValue(buildHandler(NONCE));

    await OAuthService.getSocialIdTokenForNonce(NONCE);

    expect(createLoginHandler).toHaveBeenCalledWith(
      Platform.OS,
      AuthConnection.Apple,
      false,
      { nonce: NONCE },
    );
  });

  it.each([
    ['telegram', 'telegram'],
    ['missing connection', undefined],
  ])(
    'rejects an unsupported connection (%s) without creating a handler',
    async (_label, connection) => {
      mockSeedlessState.authConnection = connection;

      await expect(
        OAuthService.getSocialIdTokenForNonce(NONCE),
      ).rejects.toMatchObject({ code: 'unsupported_social_login' });
      expect(createLoginHandler).not.toHaveBeenCalled();
    },
  );

  it('rejects when the token nonce claim does not match the requested nonce', async () => {
    (createLoginHandler as jest.Mock).mockReturnValue(
      buildHandler('other-nonce'),
    );

    await expect(
      OAuthService.getSocialIdTokenForNonce(NONCE),
    ).rejects.toMatchObject({ code: 'social_nonce_mismatch' });
  });

  it('does not run seedless authentication or change local OAuth state', async () => {
    (createLoginHandler as jest.Mock).mockReturnValue(buildHandler(NONCE));
    const handleSeedlessSpy = jest.spyOn(
      OAuthService,
      'handleSeedlessAuthenticate',
    );
    const stateBefore = { ...OAuthService.localState };

    await OAuthService.getSocialIdTokenForNonce(NONCE);

    expect(handleSeedlessSpy).not.toHaveBeenCalled();
    expect(OAuthService.localState).toEqual(stateBefore);
    handleSeedlessSpy.mockRestore();
  });

  it('propagates handler errors such as a cancelled sign-in', async () => {
    const handler = buildHandler(NONCE);
    handler.getProviderIdToken.mockRejectedValue(
      new Error('User cancelled the login process'),
    );
    (createLoginHandler as jest.Mock).mockReturnValue(handler);

    await expect(OAuthService.getSocialIdTokenForNonce(NONCE)).rejects.toThrow(
      'User cancelled the login process',
    );
  });
});

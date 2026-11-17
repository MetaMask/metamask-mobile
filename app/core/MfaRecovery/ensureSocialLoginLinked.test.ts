import Engine from '../Engine';
import type { MfaRecoveryService } from '../Engine/controllers/mfa-recovery-controller/services/mfa-recovery-service';
import {
  ensureSocialLoginLinked,
  isSocialLoginLinked,
} from './ensureSocialLoginLinked';
import { linkSocialLogin } from './linkSocialLogin';

jest.mock('../Engine', () => ({ context: {} }));
jest.mock('../apiEnv', () => ({ authEnv: () => 'dev' }));
jest.mock('./linkSocialLogin', () => ({ linkSocialLogin: jest.fn() }));

const mockLinkSocialLogin = jest.mocked(linkSocialLogin);

class SocialIdentifierNotPairedError extends Error {
  constructor() {
    super('not paired');
    this.name = 'SocialIdentifierNotPairedError';
  }
}

const exchangeSocialAccessToken = jest.fn();
const getAccessToken = jest.fn();
const getVerificationToken = jest.fn();

function setEngine(seedlessState: Record<string, unknown>) {
  Object.assign(Engine.context, {
    AuthenticationController: {
      exchangeSocialAccessToken,
      getVerificationToken,
    },
    SeedlessOnboardingController: { state: seedlessState, getAccessToken },
  });
}

const SOCIAL_STATE = { vault: 'vault', authConnection: 'google' };

function createService() {
  return {
    verifyMfa: jest.fn().mockResolvedValue(undefined),
  } as unknown as MfaRecoveryService & { verifyMfa: jest.Mock };
}

describe('isSocialLoginLinked', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setEngine(SOCIAL_STATE);
  });

  it('returns true when the social token exchanges', async () => {
    exchangeSocialAccessToken.mockResolvedValue({ profile: {} });

    expect(await isSocialLoginLinked()).toBe(true);
  });

  it('returns false when the social login was never paired', async () => {
    exchangeSocialAccessToken.mockRejectedValue(
      new SocialIdentifierNotPairedError(),
    );

    expect(await isSocialLoginLinked()).toBe(false);
  });

  it('rethrows other exchange failures', async () => {
    exchangeSocialAccessToken.mockRejectedValue(new Error('down'));

    await expect(isSocialLoginLinked()).rejects.toThrow('down');
  });
});

describe('ensureSocialLoginLinked', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setEngine(SOCIAL_STATE);
    mockLinkSocialLogin.mockResolvedValue(undefined);
  });

  it.each([
    ['without a vault', { authConnection: 'google' }],
    ['for an unsupported login', { vault: 'vault', authConnection: 'x' }],
    ['without a social login', { vault: 'vault' }],
  ])('skips %s', async (_label, state) => {
    setEngine(state);
    const service = createService();

    expect(await ensureSocialLoginLinked(service)).toBe('not_social');
    expect(exchangeSocialAccessToken).not.toHaveBeenCalled();
    expect(mockLinkSocialLogin).not.toHaveBeenCalled();
  });

  it('does nothing when the social login is linked', async () => {
    exchangeSocialAccessToken.mockResolvedValue({ profile: {} });
    const service = createService();
    const getVerifierId = jest.fn();

    expect(await ensureSocialLoginLinked(service, { getVerifierId })).toBe(
      'already_linked',
    );
    expect(service.verifyMfa).not.toHaveBeenCalled();
    expect(getVerifierId).not.toHaveBeenCalled();
    expect(mockLinkSocialLogin).not.toHaveBeenCalled();
  });

  it('verifies, then links with the trimmed email override', async () => {
    exchangeSocialAccessToken.mockRejectedValue(
      new SocialIdentifierNotPairedError(),
    );
    getVerificationToken.mockReturnValue({ accessToken: 'verified' });
    getAccessToken.mockResolvedValue('social');
    const service = createService();

    expect(
      await ensureSocialLoginLinked(service, {
        getVerifierId: async () => ' qa@example.com ',
      }),
    ).toBe('linked');

    expect(service.verifyMfa).toHaveBeenCalledTimes(1);
    expect(mockLinkSocialLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        env: 'dev',
        seedlessState: SOCIAL_STATE,
        verifierId: 'qa@example.com',
      }),
    );
    const [{ getSocialAccessToken, getVerifiedAccessToken }] =
      mockLinkSocialLogin.mock.calls[0];
    await expect(getSocialAccessToken()).resolves.toBe('social');
    expect(getVerifiedAccessToken()).toBe('verified');
  });

  it.each([
    ['no prompt', undefined],
    ['a dismissed prompt', async () => undefined],
    ['an empty email', async () => '   '],
  ])('links without an override for %s', async (_label, getVerifierId) => {
    exchangeSocialAccessToken.mockRejectedValue(
      new SocialIdentifierNotPairedError(),
    );

    await ensureSocialLoginLinked(createService(), { getVerifierId });

    expect(mockLinkSocialLogin).toHaveBeenCalledWith(
      expect.objectContaining({ verifierId: undefined }),
    );
  });

  it('propagates link failures', async () => {
    exchangeSocialAccessToken.mockRejectedValue(
      new SocialIdentifierNotPairedError(),
    );
    mockLinkSocialLogin.mockRejectedValue(new Error('link failed'));

    await expect(ensureSocialLoginLinked(createService())).rejects.toThrow(
      'link failed',
    );
  });
});

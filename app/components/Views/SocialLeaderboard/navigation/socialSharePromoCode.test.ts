import Engine from '../../../../core/Engine';
import {
  resolveSocialSharePromoCode,
  SOCIAL_SHARE_PROMO_CODE_PARAM,
  withSocialSharePromoCode,
} from './socialSharePromoCode';

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: jest.fn(),
    },
  },
}));

const mockCall = Engine.controllerMessenger.call as jest.Mock;

const referralMe = (code: string | null) => ({
  referral_code: code === null ? null : { code, kind: 'STANDARD' },
});

describe('resolveSocialSharePromoCode', () => {
  beforeEach(() => {
    mockCall.mockReset();
  });

  it('returns the user referral code from the Rewards Money controller', async () => {
    mockCall.mockResolvedValueOnce(referralMe('8f3a21'));

    await expect(resolveSocialSharePromoCode()).resolves.toBe('8F3A21');
    expect(mockCall).toHaveBeenCalledWith(
      'RewardsMoneyController:getReferralMe',
    );
  });

  it('returns undefined when the user has no code', async () => {
    mockCall.mockResolvedValueOnce(referralMe(null));

    await expect(resolveSocialSharePromoCode()).resolves.toBeUndefined();
  });

  it('returns undefined for a malformed code', async () => {
    mockCall.mockResolvedValueOnce(referralMe('BAD-CODE'));

    await expect(resolveSocialSharePromoCode()).resolves.toBeUndefined();
  });

  it('returns undefined when Rewards Money is disabled or the read fails', async () => {
    mockCall.mockRejectedValueOnce(new Error('Rewards Money is disabled'));

    await expect(resolveSocialSharePromoCode()).resolves.toBeUndefined();
  });

  it('returns undefined when the read does not answer in time', async () => {
    jest.useFakeTimers();
    mockCall.mockReturnValueOnce(new Promise(() => undefined));

    const pending = resolveSocialSharePromoCode(50);
    await jest.advanceTimersByTimeAsync(50);

    await expect(pending).resolves.toBeUndefined();
    jest.useRealTimers();
  });
});

describe('withSocialSharePromoCode', () => {
  const profileUrl = 'https://link.metamask.io/social/profile?traderId=t-1';

  it('uses the Money referral query key', () => {
    expect(SOCIAL_SHARE_PROMO_CODE_PARAM).toBe('ref');
  });

  it('adds the code as ref', () => {
    expect(withSocialSharePromoCode(profileUrl, '8F3A21')).toBe(
      `${profileUrl}&ref=8F3A21`,
    );
  });

  it('leaves the link unchanged without a code', () => {
    expect(withSocialSharePromoCode(profileUrl, undefined)).toBe(profileUrl);
  });
});

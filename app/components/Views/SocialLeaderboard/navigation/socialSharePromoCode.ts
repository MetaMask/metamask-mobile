import Engine from '../../../../core/Engine';
import {
  MONEY_REFERRAL_CODE_QUERY_PARAM,
  parseMoneyReferralCode,
} from '../../../UI/Rewards/utils/moneyReferralCode';
import { logSocialOgShare } from './socialOgShareLog';

const PROMO_CODE_TIMEOUT_MS = 2000;

/**
 * Query key for the sharer's promo code on a Social link. It is the Money
 * referral key, so `handleUniversalLink` captures it on open as a pending
 * invite, the same way it does for any MetaMask link.
 */
export const SOCIAL_SHARE_PROMO_CODE_PARAM = MONEY_REFERRAL_CODE_QUERY_PARAM;

/**
 * The sharer's own Money referral code, from `GET /referral/me` (read
 * through the controller's cache). Resolves to `undefined` when Rewards Money
 * is off, the user has no active code, or the read fails or is slow, so a
 * share never waits on it or carries a malformed code. Never rejects.
 */
export const resolveSocialSharePromoCode = async (
  timeoutMs: number = PROMO_CODE_TIMEOUT_MS,
): Promise<string | undefined> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const referralMe = await Promise.race([
      Engine.controllerMessenger.call('RewardsMoneyController:getReferralMe'),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('Referral code lookup timed out')),
          timeoutMs,
        );
      }),
    ]);
    const promoCode =
      parseMoneyReferralCode(referralMe?.referral_code?.code) ?? undefined;
    logSocialOgShare('Promo code resolved', { hasPromoCode: !!promoCode });
    return promoCode;
  } catch (error) {
    logSocialOgShare('No promo code for this share', {
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  } finally {
    clearTimeout(timer);
  }
};

/** Adds the promo code to a share link. Leaves the link as is without one. */
export const withSocialSharePromoCode = (
  canonicalUrl: string,
  promoCode: string | undefined,
): string => {
  if (!promoCode) {
    return canonicalUrl;
  }
  const url = new URL(canonicalUrl);
  url.searchParams.set(SOCIAL_SHARE_PROMO_CODE_PARAM, promoCode);
  return url.toString();
};

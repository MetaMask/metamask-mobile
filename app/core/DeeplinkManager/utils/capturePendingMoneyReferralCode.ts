import ReduxService from '../../redux';
import DevLogger from '../../SDKConnect/utils/DevLogger';
import { setPendingReferralCode } from '../../../reducers/rewardsMoney';
import {
  MONEY_REFERRAL_CODE_QUERY_PARAM,
  parseMoneyReferralCode,
} from '../../../components/UI/Rewards/utils/moneyReferralCode';

/**
 * Stores the Money referral code carried by `ref` on a deeplink the user chose
 * to open, so the invite sheet can offer it once the wallet is ready.
 *
 * Only call this after the interstitial resolved in favor of the link. A
 * missing or malformed code leaves any pending code untouched, and the link's
 * own destination is never affected. Nothing is submitted here: a referral is
 * only created when the user accepts the invite.
 *
 * @param url - The deeplink URL being handled.
 */
export function capturePendingMoneyReferralCode(url: URL): void {
  const referralCode = parseMoneyReferralCode(
    url.searchParams.get(MONEY_REFERRAL_CODE_QUERY_PARAM),
  );
  if (!referralCode) {
    return;
  }
  try {
    ReduxService.store.dispatch(setPendingReferralCode(referralCode));
  } catch (error) {
    DevLogger.log(
      'DeepLinkManager: Failed to store pending referral code',
      error,
    );
  }
}

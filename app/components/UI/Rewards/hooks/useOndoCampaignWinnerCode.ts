import { useSelector } from 'react-redux';
import {
  selectReferralCode,
  selectReferralDetailsLoading,
} from '../../../../reducers/rewards/selectors';

/**
 * Returns the winner's claim code (referral code) and its loading state,
 * scoped to the active subscription.
 */
export function useOndoCampaignWinnerCode(): {
  code: string | null;
  isLoading: boolean;
} {
  const code = useSelector(selectReferralCode);
  const isLoading = useSelector(selectReferralDetailsLoading);
  return { code: code ?? null, isLoading };
}

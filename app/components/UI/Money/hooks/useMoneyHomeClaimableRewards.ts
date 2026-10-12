import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import type { EarningsSummaryDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import type { RootState } from '../../../../reducers';
import {
  selectEarningsSummaryEntry,
  selectMoneyDashboardPersona,
  selectReferralMeLocalizedText,
} from '../../../../reducers/rewardsMoney/selectors';
import { useEarningsSummary } from '../../Rewards/hooks/useEarningsSummary';
import { useReferralMe } from '../../Rewards/hooks/useReferralMe';
import { canClaimEarnings } from '../../Rewards/utils/claimEarnings';
import { formatMusdBaseUnits } from '../../Rewards/utils/formatUtils';

function cashbackClaimable(
  summary: EarningsSummaryDto | null | undefined,
): string | undefined {
  return summary?.self_earned?.by_claim_family?.REFERRAL_TRADE_FEE_CASHBACK
    ?.claimable;
}

/**
 * Opens the Rewards Money dashboard on the earnings tab, where Claim lives.
 *
 * Do not route this through the Home tabs. When Social owns that slot, the
 * tab navigator has no Rewards screen, and naming one there is ignored. The
 * root stack always registers Rewards, and when Rewards is the tab the nearer
 * navigator still handles this same call.
 *
 * Keep the dashboard as the first Rewards screen. With `initial: false`, an
 * unmounted Rewards stack would open its default dashboard under this one,
 * and Back would land on that copy instead of Money Home.
 */
export function navigateToRewardsEarningsTab(
  navigation: Pick<AppNavigationProp, 'navigate'>,
): void {
  navigation.navigate(Routes.REWARDS_VIEW, {
    screen: Routes.REWARDS_MONEY_DASHBOARD,
    params: { initialTab: 'earnings' },
  });
}

/**
 * Whether Money Home should show a claimable rebate, and the copy and amount
 * for that card. Shown for a referee whose trade-fee cashback is at least $1.
 * The card does not claim; it sends the user to the earnings tab.
 */
export function useMoneyHomeClaimableRewards(): {
  show: boolean;
  localizedText: ReturnType<typeof selectReferralMeLocalizedText>;
  amount: string;
  refresh: () => Promise<void>;
} {
  const { profileId, fetchReferralMe } = useReferralMe();
  const { fetchEarningsSummary } = useEarningsSummary(profileId);
  const persona = useSelector((state: RootState) =>
    selectMoneyDashboardPersona(state, profileId),
  );
  const localizedText = useSelector((state: RootState) =>
    selectReferralMeLocalizedText(state, profileId),
  );
  const summary =
    useSelector((state: RootState) =>
      selectEarningsSummaryEntry(state, profileId),
    )?.data ?? null;
  const show = Boolean(localizedText) && canClaimEarnings(summary, persona);
  const amount =
    formatMusdBaseUnits(cashbackClaimable(summary), {
      maximumFractionDigits: 2,
    }) ?? '';

  const refresh = useCallback(async () => {
    await Promise.all([
      fetchReferralMe({ forceFresh: true }).catch(() => undefined),
      fetchEarningsSummary({ forceFresh: true }).catch(() => undefined),
    ]);
  }, [fetchEarningsSummary, fetchReferralMe]);

  return { show, localizedText, amount, refresh };
}

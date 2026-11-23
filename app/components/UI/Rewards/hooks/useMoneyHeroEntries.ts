import { useSelector } from 'react-redux';
import type { EarningsSummaryDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import type { RootState } from '../../../../reducers';
import type { ReferralMeEntry } from '../../../../reducers/rewardsMoney';
import {
  selectEarningsSummaryEntry,
  selectReferralMeEntry,
} from '../../../../reducers/rewardsMoney/selectors';
import { useEarningsSummary } from './useEarningsSummary';
import { useReferralMe } from './useReferralMe';

export type MoneyHeroErrorSource = 'referral' | 'earnings';

/**
 * Shared read state for the Money hero cards. Each card still chooses which
 * end date and which claim families to show.
 */
export const useMoneyHeroEntries = (
  profileId: string,
): {
  referralMeEntry: ReferralMeEntry | undefined;
  earningsSummary: EarningsSummaryDto | null;
  isEarningsLoading: boolean;
  unavailableAmount: '-' | null;
  errorSource: MoneyHeroErrorSource | null;
  retry: () => void;
  retryLoading: boolean;
} => {
  const referralMeEntry = useSelector((state: RootState) =>
    selectReferralMeEntry(state, profileId),
  );
  const earningsSummaryEntry = useSelector((state: RootState) =>
    selectEarningsSummaryEntry(state, profileId),
  );
  const { fetchReferralMe } = useReferralMe({ fetchOnMount: false });
  const { fetchEarningsSummary } = useEarningsSummary(profileId);
  const earningsSummary: EarningsSummaryDto | null =
    earningsSummaryEntry?.data ?? null;
  const isEarningsLoading =
    !earningsSummary &&
    (!earningsSummaryEntry || Boolean(earningsSummaryEntry.loading));
  const unavailableAmount =
    Boolean(earningsSummaryEntry?.error) && !earningsSummary ? '-' : null;
  const errorSource: MoneyHeroErrorSource | null =
    referralMeEntry?.error && !referralMeEntry.data
      ? 'referral'
      : earningsSummaryEntry?.error && !earningsSummaryEntry.data
        ? 'earnings'
        : null;
  const retry = () => {
    if (errorSource === 'referral') {
      void fetchReferralMe({ forceFresh: true });
      return;
    }
    if (errorSource === 'earnings') {
      void fetchEarningsSummary({ forceFresh: true }).catch(() => undefined);
    }
  };
  const retryLoading =
    errorSource === 'referral'
      ? Boolean(referralMeEntry?.loading)
      : Boolean(earningsSummaryEntry?.loading);

  return {
    referralMeEntry,
    earningsSummary,
    isEarningsLoading,
    unavailableAmount,
    errorSource,
    retry,
    retryLoading,
  };
};

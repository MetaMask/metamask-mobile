import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { SectionHeader } from '@metamask/design-system-react-native';
import type { RootState } from '../../../../../reducers';
import { selectEarningsSummaryEntry } from '../../../../../reducers/rewardsMoney/selectors';
import type {
  EarningClaimFamily,
  ReferralLocalizedText,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { useEarningsSummary } from '../../hooks/useEarningsSummary';
import EarnActionHeader, { type EarnActionHeaderCta } from './EarnActionHeader';
import EarnFamilyEarningsSection, {
  type EarnFamilyExtraRow,
} from './EarnFamilyEarningsSection';
import { deriveSummarySection } from './Tabs/earningsSummarySection';
import { EARN_PAGE_HEADER_TEST_IDS } from './EarnPageHeader.testIds';

interface EarnPageHeaderProps {
  profileId: string;
  localizedText: ReferralLocalizedText;
  title: string;
  description: string;
  cta?: EarnActionHeaderCta;
  ctaSubtext?: string;
  branch: 'self_earned' | 'earned_by_others';
  family: EarningClaimFamily;
  extraRows?: EarnFamilyExtraRow[];
  /** Set on the referrals page, the only breakdown that reads the funnel. */
  funnelFailed?: boolean;
  funnelRefreshing?: boolean;
  onRetryFunnel?: () => void;
}

/**
 * Everything above the activity list on an earn page: the action section, the
 * family's Your earnings, and the title of the list that follows. It is the
 * `header` of a `TradingActivityListView`, so it scrolls with the rows.
 */
const EarnPageHeader: React.FC<EarnPageHeaderProps> = ({
  profileId,
  localizedText,
  title,
  description,
  cta,
  ctaSubtext,
  branch,
  family,
  extraRows,
  funnelFailed = false,
  funnelRefreshing = false,
  onRetryFunnel,
}) => {
  const summaryEntry = useSelector((state: RootState) =>
    selectEarningsSummaryEntry(state, profileId),
  );
  const { fetchEarningsSummary } = useEarningsSummary(profileId);
  const retry = useCallback(() => {
    void Promise.resolve(fetchEarningsSummary({ forceFresh: true })).catch(
      () => undefined,
    );
  }, [fetchEarningsSummary]);

  return (
    <>
      <EarnActionHeader
        title={title}
        description={description}
        cta={cta}
        subtext={ctaSubtext}
      />
      <EarnFamilyEarningsSection
        localizedText={localizedText}
        summary={deriveSummarySection(summaryEntry)}
        branch={branch}
        family={family}
        extraRows={extraRows}
        funnelFailed={funnelFailed}
        funnelRefreshing={funnelRefreshing}
        onRetry={retry}
        onRetryFunnel={onRetryFunnel}
      />
      <SectionHeader
        title={localizedText.history}
        twClassName="pt-0 pb-4"
        testID={EARN_PAGE_HEADER_TEST_IDS.HISTORY_HEADER}
      />
    </>
  );
};

export default EarnPageHeader;

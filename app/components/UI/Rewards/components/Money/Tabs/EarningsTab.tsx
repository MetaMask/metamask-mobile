import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  IconColor,
  IconName,
  SectionHeader,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { RootState } from '../../../../../../reducers';
import {
  refereeMoneySections,
  selectEarningsSummaryEntry,
  selectReferralMeEntry,
  selectReferralMeLocalizedText,
  type MoneyDashboardPersona,
  type RefereeMoneySections,
} from '../../../../../../reducers/rewardsMoney/selectors';
import type {
  EarningsSummaryDto,
  ReferralLocalizedText,
} from '../../../../../../core/Engine/controllers/rewards-money-controller/types';
import { strings } from '../../../../../../../locales/i18n';
import RewardsErrorBanner from '../../RewardsErrorBanner';
import { useEarningsSummary } from '../../../hooks/useEarningsSummary';
import { selectIsSocialV1Enabled } from '../../../../../../selectors/featureFlagController/socialV1';
import {
  earnedByOthersLifetime,
  selfEarnedLifetime,
} from '../../../utils/earningsSummaryTotals';
import { deriveSummarySection, musdAmount } from './earningsSummarySection';
import { EARNINGS_TAB_TEST_IDS } from './EarningsTab.testIds';

// ---------------------------------------------------------------------------
// Your earnings section: lifetime totals per earning family.
// ---------------------------------------------------------------------------

interface BreakdownRow {
  key: string;
  iconName: IconName;
  label: string;
  description: string;
  amount: string;
}

function breakdownRows(
  persona: MoneyDashboardPersona,
  summary: EarningsSummaryDto | null,
  localizedText: ReferralLocalizedText,
  sections: RefereeMoneySections,
  socialEnabled: boolean,
): BreakdownRow[] {
  if (persona === 'plain') {
    return [];
  }

  const trading: BreakdownRow = {
    key: 'trading',
    iconName: IconName.SwapVertical,
    label: localizedText.breakdownTrading,
    description: localizedText.breakdownTradingDescription,
    amount: musdAmount(
      selfEarnedLifetime(summary, 'REFERRAL_TRADE_FEE_CASHBACK'),
    ),
  };
  const referrals: BreakdownRow = {
    key: 'referrals',
    iconName: IconName.UserCircleAdd,
    label: localizedText.referrals,
    description: localizedText.breakdownReferralsDescription,
    amount: musdAmount(earnedByOthersLifetime(summary, 'REFERRAL_REV_SHARE')),
  };
  const social: BreakdownRow = {
    key: 'social',
    iconName: IconName.People,
    label: localizedText.tradingCommissionsSection,
    description: localizedText.breakdownSocialDescription,
    amount: musdAmount(earnedByOthersLifetime(summary, 'SOCIAL_FOLLOW_TRADE')),
  };

  if (persona === 'referrer') {
    return socialEnabled ? [referrals, social] : [referrals];
  }

  const rows: BreakdownRow[] = [];
  if (sections.tradingRebates) {
    rows.push(trading);
  }
  if (sections.socialRewards && socialEnabled) {
    rows.push(social);
  }
  return rows;
}

const BreakdownSkeleton: React.FC<{ rows: number }> = ({ rows }) => {
  const tw = useTailwind();

  return (
    <Box twClassName="gap-4" testID={EARNINGS_TAB_TEST_IDS.BREAKDOWN_SKELETON}>
      {Array.from({ length: rows }, (_, index) => (
        <Box
          key={index}
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-3"
        >
          <Skeleton style={tw.style('h-10 w-10 rounded-full')} />
          <Skeleton style={tw.style('h-4 w-28 flex-1 rounded-md')} />
          <Skeleton style={tw.style('h-4 w-16 rounded-md')} />
        </Box>
      ))}
    </Box>
  );
};

const BreakdownSection: React.FC<{
  localizedText: ReferralLocalizedText;
  rows: BreakdownRow[];
  loading: boolean;
}> = ({ localizedText, rows, loading }) => (
  <>
    <SectionHeader
      // A payload cached before the server added the key has no yourEarnings.
      title={localizedText.yourEarnings ?? localizedText.breakdown}
      twClassName="pt-4 pb-4"
      testID={EARNINGS_TAB_TEST_IDS.BREAKDOWN_HEADER}
    />
    <Box twClassName="px-4 pb-8">
      {loading ? (
        <BreakdownSkeleton rows={rows.length} />
      ) : (
        <Box twClassName="gap-4" testID={EARNINGS_TAB_TEST_IDS.BREAKDOWN}>
          {rows.map((row) => (
            <Box
              key={row.key}
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-3"
              testID={`${EARNINGS_TAB_TEST_IDS.BREAKDOWN_ROW}-${row.key}`}
            >
              <AvatarIcon
                iconName={row.iconName}
                size={AvatarIconSize.Md}
                severity={AvatarIconSeverity.Neutral}
                iconProps={{ color: IconColor.IconDefault }}
              />
              <Box twClassName="flex-1">
                <Text variant={TextVariant.BodyMd}>{row.label}</Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {row.description}
                </Text>
              </Box>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.SuccessDefault}
              >
                {row.amount}
              </Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  </>
);

// ---------------------------------------------------------------------------
// Tab.
// ---------------------------------------------------------------------------

interface EarningsTabProps {
  profileId: string;
  persona: MoneyDashboardPersona;
}

const EarningsTab: React.FC<EarningsTabProps> = ({ profileId, persona }) => {
  const localizedText = useSelector((state: RootState) =>
    selectReferralMeLocalizedText(state, profileId),
  );
  const showTradingCommissions = useSelector(selectIsSocialV1Enabled);
  const roles = useSelector(
    (state: RootState) => selectReferralMeEntry(state, profileId)?.data?.roles,
  );
  const sections = refereeMoneySections(roles);
  const earningsSummaryEntry = useSelector((state: RootState) =>
    selectEarningsSummaryEntry(state, profileId),
  );
  const { fetchEarningsSummary } = useEarningsSummary(profileId);
  const retrySummary = useCallback(() => {
    void Promise.resolve(fetchEarningsSummary({ forceFresh: true })).catch(
      () => undefined,
    );
  }, [fetchEarningsSummary]);

  if (!localizedText) {
    return null;
  }

  const summary = deriveSummarySection(earningsSummaryEntry);
  const rows = breakdownRows(
    persona,
    summary.data,
    localizedText,
    sections,
    showTradingCommissions,
  );
  // One earning type does not need a split. The section appears only when
  // two rows remain after the role and Social V1 filters.
  const showBreakdown = summary.show && rows.length >= 2;

  return (
    <Box testID={EARNINGS_TAB_TEST_IDS.CONTAINER}>
      {summary.error ? (
        <Box twClassName="px-4 pt-4">
          <RewardsErrorBanner
            title={strings(
              'rewards.referral_details_error.error_fetching_title',
            )}
            description={strings(
              'rewards.referral_details_error.error_fetching_description',
            )}
            onConfirm={retrySummary}
            confirmButtonLabel={strings(
              'rewards.referral_details_error.retry_button',
            )}
            onConfirmLoading={summary.refreshing}
            testID={EARNINGS_TAB_TEST_IDS.SUMMARY_ERROR}
          />
        </Box>
      ) : null}
      {showBreakdown ? (
        <BreakdownSection
          localizedText={localizedText}
          rows={rows}
          loading={summary.loading}
        />
      ) : null}
    </Box>
  );
};

export default EarningsTab;

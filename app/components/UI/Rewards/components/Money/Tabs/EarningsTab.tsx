import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  IconColor,
  IconName,
  SectionDivider,
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
import Routes from '../../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import { strings } from '../../../../../../../locales/i18n';
import RewardsErrorBanner from '../../RewardsErrorBanner';
import { useEarningsSummary } from '../../../hooks/useEarningsSummary';
import { selectIsSocialV1Enabled } from '../../../../../../selectors/featureFlagController/socialV1';
import {
  earnedByOthersLifetime,
  selfEarnedLifetime,
} from '../../../utils/earningsSummaryTotals';
import { navigateToRewardsRoute } from '../../../utils';
import { earnActionRows, type EarnActionRowKey } from './earnActionRows';
import EarnActionSection from './EarnActionSection';
import { EARN_ACTION_SECTION_TEST_IDS } from './EarnActionSection.testIds';
import {
  deriveBreakdownErrorSource,
  deriveSummarySection,
  musdAmount,
} from './earningsSummarySection';
import { EARNINGS_TAB_TEST_IDS } from './EarningsTab.testIds';

/** The page each Ways to earn row opens. */
const WAY_TO_EARN_ROUTES = {
  referrals: Routes.REWARDS_MONEY_REFERRALS_VIEW,
  trading: Routes.REWARDS_TRADING_REBATES_VIEW,
  social: Routes.REWARDS_COPY_TRADING_VIEW,
} as const satisfies Record<EarnActionRowKey, string>;

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

const SummaryErrorBanner: React.FC<{
  refreshing: boolean;
  onRetry: () => void;
}> = ({ refreshing, onRetry }) => (
  <RewardsErrorBanner
    title={strings('rewards.earnings_summary_error.error_fetching_title')}
    description={strings(
      'rewards.earnings_summary_error.error_fetching_description',
    )}
    onConfirm={onRetry}
    confirmButtonLabel={strings('rewards.earnings_summary_error.retry_button')}
    onConfirmLoading={refreshing}
    testID={EARNINGS_TAB_TEST_IDS.SUMMARY_ERROR}
  />
);

const BreakdownSection: React.FC<{
  localizedText: ReferralLocalizedText;
  rows: BreakdownRow[];
  loading: boolean;
  /** Ways to earn above this section supplies the divider and header spacing. */
  followsSection: boolean;
  /** One banner under the amounts. Summary wins over a funnel failure. */
  errorBanner?: React.ReactNode;
}> = ({ localizedText, rows, loading, followsSection, errorBanner }) => (
  <>
    {followsSection ? <SectionDivider marginVertical={8} /> : null}
    <SectionHeader
      // A payload cached before the server added the key has no yourEarnings.
      title={localizedText.yourEarnings ?? localizedText.breakdown}
      twClassName={followsSection ? 'pt-0 pb-4' : 'pt-4 pb-4'}
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
                iconProps={{ color: IconColor.IconAlternative }}
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
      {errorBanner ? <Box twClassName="pt-4">{errorBanner}</Box> : null}
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
  const isSocialV1Enabled = useSelector(selectIsSocialV1Enabled);
  const roles = useSelector(
    (state: RootState) => selectReferralMeEntry(state, profileId)?.data?.roles,
  );
  const sections = refereeMoneySections(roles);
  const earningsSummaryEntry = useSelector((state: RootState) =>
    selectEarningsSummaryEntry(state, profileId),
  );
  const { fetchEarningsSummary } = useEarningsSummary(profileId);
  const navigation = useNavigation<AppNavigationProp>();
  const openWayToEarn = useCallback(
    (key: EarnActionRowKey) => {
      navigateToRewardsRoute(navigation, WAY_TO_EARN_ROUTES[key]);
    },
    [navigation],
  );
  const retrySummary = useCallback(() => {
    void Promise.resolve(fetchEarningsSummary({ forceFresh: true })).catch(
      () => undefined,
    );
  }, [fetchEarningsSummary]);

  if (!localizedText) {
    return null;
  }

  const summary = deriveSummarySection(earningsSummaryEntry);
  // The Earnings tab has no funnel counts, so the shared chooser only ever
  // reports the summary. The banner still sits under the breakdown.
  const errorSource = deriveBreakdownErrorSource(summary.failed, false);
  const rows = breakdownRows(
    persona,
    summary.data,
    localizedText,
    sections,
    isSocialV1Enabled,
  );
  const waysToEarnRows = earnActionRows(
    persona,
    localizedText,
    sections,
    isSocialV1Enabled,
  );
  const showWaysToEarn = waysToEarnRows.length > 0;
  // The role and Social V1 filters decide the rows. One row is enough, and a
  // failed summary still renders them so missing amounts read as a dash.
  const showBreakdown = rows.length >= 1;

  return (
    <Box testID={EARNINGS_TAB_TEST_IDS.CONTAINER}>
      {showWaysToEarn ? (
        <EarnActionSection
          title={localizedText.waysToEarn}
          rows={waysToEarnRows}
          onPressRow={openWayToEarn}
          followsSection={false}
          testIDs={{
            container: EARN_ACTION_SECTION_TEST_IDS.WAYS_TO_EARN,
            header: EARN_ACTION_SECTION_TEST_IDS.WAYS_TO_EARN_HEADER,
            row: EARN_ACTION_SECTION_TEST_IDS.WAYS_TO_EARN_ROW,
          }}
        />
      ) : null}
      {showBreakdown ? (
        <BreakdownSection
          localizedText={localizedText}
          rows={rows}
          loading={summary.loading && !summary.data && !summary.failed}
          followsSection={showWaysToEarn}
          errorBanner={
            errorSource ? (
              <SummaryErrorBanner
                refreshing={summary.refreshing}
                onRetry={retrySummary}
              />
            ) : undefined
          }
        />
      ) : null}
      {!showBreakdown && errorSource ? (
        <Box twClassName="px-4 pt-4">
          <SummaryErrorBanner
            refreshing={summary.refreshing}
            onRetry={retrySummary}
          />
        </Box>
      ) : null}
    </Box>
  );
};

export default EarningsTab;

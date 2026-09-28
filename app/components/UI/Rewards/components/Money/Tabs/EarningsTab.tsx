import React from 'react';
import { useNavigation } from '@react-navigation/native';
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
  SectionDivider,
  SectionHeader,
  Skeleton,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import Routes from '../../../../../../constants/navigation/Routes';
import type { RootState } from '../../../../../../reducers';
import {
  selectEarningsSummaryEntry,
  selectReferralMeLocalizedText,
} from '../../../../../../reducers/rewardsMoney/selectors';
import type {
  EarningsSummaryDto,
  ReferralLocalizedText,
  ReferralVariant,
} from '../../../../../../core/Engine/controllers/rewards-money-controller/types';
import { strings } from '../../../../../../../locales/i18n';
import { navigateToRewardsRoute } from '../../../utils';
import RewardsErrorBanner from '../../RewardsErrorBanner';
import { useEarningsSummary } from '../../../hooks/useEarningsSummary';
import { useLast7DaysEarnings } from '../../../hooks/useLast7DaysEarnings';
import { useEarningsHistory } from '../../../hooks/useEarningsHistory';
import { formatMusdBaseUnits } from '../../../utils/formatUtils';
import {
  earnedByOthersLifetime,
  selfEarnedLifetime,
} from '../../../utils/earningsSummaryTotals';
import ClaimableRewardsCard from '../ClaimableRewardsCard';
import { EarningsHistoryRow } from '../EarningsHistoryRows';
import TradingActivityListSkeleton from '../TradingActivityListSkeleton';

/** Rows shown under History before "see all". Matches the Performance preview. */
const EARNINGS_HISTORY_PREVIEW_COUNT = 5;

export const EARNINGS_TAB_TEST_IDS = {
  CONTAINER: 'rewards-money-earnings-tab',
  SUMMARY_ERROR: 'rewards-money-earnings-summary-error',
  LAST_7_ERROR: 'rewards-money-earnings-last-7-error',
  HISTORY_ERROR: 'rewards-money-earnings-history-error',
  BREAKDOWN: 'rewards-money-earnings-breakdown',
  BREAKDOWN_HEADER: 'rewards-money-earnings-breakdown-header',
  BREAKDOWN_SKELETON: 'rewards-money-earnings-breakdown-skeleton',
  BREAKDOWN_ROW: 'rewards-money-earnings-breakdown-row',
  HISTORY: 'rewards-money-earnings-history',
  HISTORY_HEADER: 'rewards-money-earnings-history-header',
} as const;

interface BreakdownRow {
  key: string;
  iconName: IconName;
  label: string;
  amount: string | null;
}

function breakdownRows(
  variant: ReferralVariant,
  summary: EarningsSummaryDto | null,
  localizedText: ReferralLocalizedText,
): BreakdownRow[] {
  if (variant === 'NONE') {
    return [];
  }

  const amountFor = (baseUnits: string | null): string | null =>
    formatMusdBaseUnits(baseUnits, { maximumFractionDigits: 2 });

  if (variant === 'REFERRER') {
    return [
      {
        key: 'referrals',
        iconName: IconName.UserCircleAdd,
        label: localizedText.referrals,
        amount: amountFor(
          earnedByOthersLifetime(summary, 'REFERRAL_REV_SHARE'),
        ),
      },
      {
        key: 'commissions',
        iconName: IconName.Copy,
        label: localizedText.tradeCommissions,
        amount: amountFor(
          earnedByOthersLifetime(summary, 'SOCIAL_FOLLOW_TRADE'),
        ),
      },
    ];
  }

  return [
    {
      key: 'commissions',
      iconName: IconName.Copy,
      label: localizedText.tradingCommissionsSection,
      amount: amountFor(earnedByOthersLifetime(summary, 'SOCIAL_FOLLOW_TRADE')),
    },
    {
      key: 'rebates',
      iconName: IconName.Coin,
      label: localizedText.tradingRebates,
      amount: amountFor(
        selfEarnedLifetime(summary, 'REFERRAL_TRADE_FEE_CASHBACK'),
      ),
    },
  ];
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

interface EarningsTabProps {
  profileId: string;
  variant: ReferralVariant;
  onViewPerformance?: () => void;
}

const EarningsTab: React.FC<EarningsTabProps> = ({
  profileId,
  variant,
  onViewPerformance,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const localizedText = useSelector((state: RootState) =>
    selectReferralMeLocalizedText(state, profileId),
  );
  const earningsSummaryEntry = useSelector((state: RootState) =>
    selectEarningsSummaryEntry(state, profileId),
  );
  const { fetchEarningsSummary } = useEarningsSummary(profileId);
  const last7 = useLast7DaysEarnings(profileId);
  const history = useEarningsHistory(profileId);

  if (!localizedText) {
    return null;
  }

  const summary = earningsSummaryEntry?.data ?? null;
  const summaryLoading =
    !summary &&
    (!earningsSummaryEntry || Boolean(earningsSummaryEntry.loading));
  const summaryError = Boolean(earningsSummaryEntry?.error);
  const last7Loading = last7.isLoading && !last7.data;
  const last7Error = last7.error;
  const historyItems = history.items ?? [];
  const historyLoading = history.isLoading && !history.items;
  const historyError = Boolean(history.error);
  const previewHistory = historyItems.slice(0, EARNINGS_HISTORY_PREVIEW_COUNT);
  const rows = breakdownRows(variant, summary, localizedText);

  // One banner for the tab. The unwindowed summary wins, then last 7 days,
  // then history. Retry refetches only that source.
  const errorSource = summaryError
    ? 'summary'
    : last7Error
      ? 'last7'
      : historyError
        ? 'history'
        : null;
  const errorCopy =
    errorSource === 'history'
      ? 'rewards.trading_activity_error'
      : 'rewards.referral_details_error';
  const showCard = summaryLoading || summary !== null;
  const showBreakdown = rows.length > 0 && (summaryLoading || summary !== null);
  const showHistory = !(
    historyError &&
    previewHistory.length === 0 &&
    !historyLoading
  );

  return (
    <Box testID={EARNINGS_TAB_TEST_IDS.CONTAINER}>
      {/* Same block as the hero cards on Ways to Earn: the banner and the
          card share one padded box so the gap between them matches. */}
      {errorSource || showCard ? (
        <Box twClassName="mt-3 gap-3 px-4 pt-4">
          {errorSource ? (
            <RewardsErrorBanner
              title={strings(`${errorCopy}.error_fetching_title`)}
              description={strings(`${errorCopy}.error_fetching_description`)}
              onConfirm={() => {
                if (errorSource === 'summary') {
                  fetchEarningsSummary({ forceFresh: true });
                  return;
                }
                if (errorSource === 'last7') {
                  last7.retry();
                  return;
                }
                history.retry();
              }}
              confirmButtonLabel={strings(`${errorCopy}.retry_button`)}
              onConfirmLoading={
                errorSource === 'summary'
                  ? Boolean(earningsSummaryEntry?.loading)
                  : errorSource === 'last7'
                    ? last7.isLoading
                    : false
              }
              testID={
                errorSource === 'summary'
                  ? EARNINGS_TAB_TEST_IDS.SUMMARY_ERROR
                  : errorSource === 'last7'
                    ? EARNINGS_TAB_TEST_IDS.LAST_7_ERROR
                    : EARNINGS_TAB_TEST_IDS.HISTORY_ERROR
              }
            />
          ) : null}
          {showCard ? (
            <ClaimableRewardsCard
              localizedText={localizedText}
              claimable={summary?.claimable}
              claimed={summary?.claimed}
              claimableAmount={
                formatMusdBaseUnits(summary?.claimable, {
                  maximumFractionDigits: 2,
                }) ?? '—'
              }
              recordedAmount={
                formatMusdBaseUnits(summary?.lifetime_total, {
                  maximumFractionDigits: 2,
                }) ?? '—'
              }
              last7Amount={
                last7.data
                  ? (formatMusdBaseUnits(last7.data.lifetime_total, {
                      maximumFractionDigits: 2,
                    }) ?? '—')
                  : null
              }
              isSummaryLoading={summaryLoading}
              isLast7Loading={last7Loading}
            />
          ) : null}
        </Box>
      ) : null}

      {showBreakdown ? (
        <>
          {showCard ? <SectionDivider marginVertical={8} /> : null}
          <SectionHeader
            title={localizedText.breakdown}
            isInteractive={Boolean(onViewPerformance)}
            onPress={onViewPerformance}
            twClassName={showCard ? 'pt-0 pb-4' : 'pt-6 pb-4'}
            testID={EARNINGS_TAB_TEST_IDS.BREAKDOWN_HEADER}
          />
          <Box twClassName="px-4">
            {summaryLoading ? (
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
                    <Text variant={TextVariant.BodyMd} twClassName="flex-1">
                      {row.label}
                    </Text>
                    <Text variant={TextVariant.BodyMd}>
                      {row.amount ?? '—'}
                    </Text>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </>
      ) : null}

      {showHistory ? (
        <>
          {showCard || showBreakdown ? (
            <SectionDivider marginVertical={8} />
          ) : null}
          <SectionHeader
            title={localizedText.history}
            isInteractive
            onPress={() =>
              navigateToRewardsRoute(
                navigation,
                Routes.REWARDS_EARNINGS_HISTORY_VIEW,
              )
            }
            twClassName={showCard || showBreakdown ? 'pt-0 pb-4' : 'pt-6 pb-4'}
            testID={EARNINGS_TAB_TEST_IDS.HISTORY_HEADER}
          />
          <Box twClassName="px-4 pb-8">
            {historyLoading ? (
              <TradingActivityListSkeleton
                rows={EARNINGS_HISTORY_PREVIEW_COUNT}
              />
            ) : (
              <Box twClassName="gap-4" testID={EARNINGS_TAB_TEST_IDS.HISTORY}>
                {previewHistory.map((item) => (
                  <EarningsHistoryRow
                    key={`${item.type}-${item.id}`}
                    item={item}
                    localizedText={localizedText}
                  />
                ))}
              </Box>
            )}
          </Box>
        </>
      ) : null}
    </Box>
  );
};

export default EarningsTab;

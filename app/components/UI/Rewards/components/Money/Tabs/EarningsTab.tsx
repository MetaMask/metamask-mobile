import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonSize,
  ButtonVariant,
  IconColor,
  IconName,
  SectionDivider,
  SectionHeader,
  Skeleton,
  TabEmptyState,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import Routes from '../../../../../../constants/navigation/Routes';
import type { RootState } from '../../../../../../reducers';
import type { EarningsSummaryEntry } from '../../../../../../reducers/rewardsMoney';
import {
  selectEarningsSummaryEntry,
  selectReferralMeLocalizedText,
} from '../../../../../../reducers/rewardsMoney/selectors';
import type {
  ClaimDto,
  EarningsSummaryDto,
  LedgerEntryDto,
  ReferralLocalizedText,
  ReferralVariant,
} from '../../../../../../core/Engine/controllers/rewards-money-controller/types';
import { strings } from '../../../../../../../locales/i18n';
import { navigateToRewardsRoute } from '../../../utils';
import RewardsErrorBanner from '../../RewardsErrorBanner';
import type { UseCursorPaginatedListResult } from '../../../hooks/useCursorPaginatedList';
import { useEarningsSummary } from '../../../hooks/useEarningsSummary';
import { useLast7DaysEarnings } from '../../../hooks/useLast7DaysEarnings';
import { useEarningsHistory } from '../../../hooks/useEarningsHistory';
import { useClaimEarnings } from '../../../hooks/useClaimEarnings';
import { useInFlightClaims } from '../../../hooks/useInFlightClaims';
import {
  canClaimEarnings,
  isPendingClaimRow,
  mergeInFlightClaims,
  type EarningsHistoryListItem,
} from '../../../utils/claimEarnings';
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
  HISTORY_EMPTY: 'rewards-money-earnings-history-empty',
} as const;

/** mUSD base units as a two-decimal amount, or a dash when there is none. */
const musdAmount = (baseUnits: string | null | undefined): string =>
  formatMusdBaseUnits(baseUnits, { maximumFractionDigits: 2 }) ?? '—';

// ---------------------------------------------------------------------------
// Derived state. Each source (summary, history) reduces to the same
// questions: is it loading, did it fail, should its section render.
// ---------------------------------------------------------------------------

interface SummarySectionState {
  data: EarningsSummaryDto | null;
  loading: boolean;
  refreshing: boolean;
  error: boolean;
  show: boolean;
}

function deriveSummarySection(
  entry: EarningsSummaryEntry | undefined,
): SummarySectionState {
  const data = entry?.data ?? null;
  const loading = !data && (!entry || Boolean(entry.loading));
  return {
    data,
    loading,
    refreshing: Boolean(entry?.loading),
    error: Boolean(entry?.error),
    show: loading || data !== null,
  };
}

interface HistorySectionState {
  items: EarningsHistoryListItem[];
  loading: boolean;
  error: boolean;
  show: boolean;
  listEmpty: boolean;
}

function deriveHistorySection(
  list: UseCursorPaginatedListResult<LedgerEntryDto>,
  claims: ClaimDto[],
): HistorySectionState {
  const items = (mergeInFlightClaims(list.items, claims) ?? []).slice(
    0,
    EARNINGS_HISTORY_PREVIEW_COUNT,
  );
  const loading = list.isLoading && !list.items;
  const error = Boolean(list.error);
  return {
    items,
    loading,
    error,
    // Hidden only when the request failed with nothing cached to show.
    show: !(error && items.length === 0 && !loading),
    listEmpty: !loading && items.length === 0,
  };
}

// ---------------------------------------------------------------------------
// Error banner. One per tab: the unwindowed summary wins, then last 7 days,
// then history, and retry refetches only that source.
// ---------------------------------------------------------------------------

type ErrorSource = 'summary' | 'last7' | 'history';

function deriveErrorSource(
  summaryError: boolean,
  last7Error: boolean,
  historyError: boolean,
): ErrorSource | null {
  if (summaryError) {
    return 'summary';
  }
  if (last7Error) {
    return 'last7';
  }
  if (historyError) {
    return 'history';
  }
  return null;
}

const EarningsErrorBanner: React.FC<{
  source: ErrorSource;
  summaryRefreshing: boolean;
  last7Refreshing: boolean;
  onRetrySummary: () => void;
  onRetryLast7: () => void;
  onRetryHistory: () => void;
}> = ({
  source,
  summaryRefreshing,
  last7Refreshing,
  onRetrySummary,
  onRetryLast7,
  onRetryHistory,
}) => {
  const copy =
    source === 'history'
      ? 'rewards.trading_activity_error'
      : 'rewards.referral_details_error';
  const retry = {
    summary: onRetrySummary,
    last7: onRetryLast7,
    history: onRetryHistory,
  }[source];
  const refreshing = {
    summary: summaryRefreshing,
    last7: last7Refreshing,
    history: false,
  }[source];
  const testID = {
    summary: EARNINGS_TAB_TEST_IDS.SUMMARY_ERROR,
    last7: EARNINGS_TAB_TEST_IDS.LAST_7_ERROR,
    history: EARNINGS_TAB_TEST_IDS.HISTORY_ERROR,
  }[source];

  return (
    <RewardsErrorBanner
      title={strings(`${copy}.error_fetching_title`)}
      description={strings(`${copy}.error_fetching_description`)}
      onConfirm={retry}
      confirmButtonLabel={strings(`${copy}.retry_button`)}
      onConfirmLoading={refreshing}
      testID={testID}
    />
  );
};

// ---------------------------------------------------------------------------
// Breakdown section: lifetime totals per earning family.
// ---------------------------------------------------------------------------

interface BreakdownRow {
  key: string;
  iconName: IconName;
  label: string;
  amount: string;
}

function breakdownRows(
  variant: ReferralVariant,
  summary: EarningsSummaryDto | null,
  localizedText: ReferralLocalizedText,
): BreakdownRow[] {
  if (variant === 'NONE') {
    return [];
  }

  if (variant === 'REFERRER') {
    return [
      {
        key: 'referrals',
        iconName: IconName.UserCircleAdd,
        label: localizedText.referrals,
        amount: musdAmount(
          earnedByOthersLifetime(summary, 'REFERRAL_REV_SHARE'),
        ),
      },
      {
        key: 'commissions',
        iconName: IconName.Copy,
        label: localizedText.tradeCommissions,
        amount: musdAmount(
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
      amount: musdAmount(
        earnedByOthersLifetime(summary, 'SOCIAL_FOLLOW_TRADE'),
      ),
    },
    {
      key: 'rebates',
      iconName: IconName.Coin,
      label: localizedText.tradingRebates,
      amount: musdAmount(
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

const BreakdownSection: React.FC<{
  localizedText: ReferralLocalizedText;
  rows: BreakdownRow[];
  loading: boolean;
  /** A section above this one supplies the divider and header spacing. */
  followsSection: boolean;
  onViewPerformance?: () => void;
}> = ({ localizedText, rows, loading, followsSection, onViewPerformance }) => (
  <>
    {followsSection ? <SectionDivider marginVertical={8} /> : null}
    <SectionHeader
      title={localizedText.breakdown}
      isInteractive={Boolean(onViewPerformance)}
      onPress={onViewPerformance}
      twClassName={followsSection ? 'pt-0 pb-4' : 'pt-6 pb-4'}
      testID={EARNINGS_TAB_TEST_IDS.BREAKDOWN_HEADER}
    />
    <Box twClassName="px-4">
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
              <Text variant={TextVariant.BodyMd} twClassName="flex-1">
                {row.label}
              </Text>
              <Text variant={TextVariant.BodyMd}>{row.amount}</Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  </>
);

// ---------------------------------------------------------------------------
// History section: a header that opens the full list while there are rows,
// then a skeleton, an empty state, or the preview rows.
// ---------------------------------------------------------------------------

const HistorySection: React.FC<{
  localizedText: ReferralLocalizedText;
  state: HistorySectionState;
  /** A section above this one supplies the divider and header spacing. */
  followsSection: boolean;
  onEmptyAction: () => void;
  onOpenList: () => void;
}> = ({ localizedText, state, followsSection, onEmptyAction, onOpenList }) => {
  const { items, loading, listEmpty } = state;

  let body: React.ReactElement;
  if (loading) {
    body = (
      <TradingActivityListSkeleton rows={EARNINGS_HISTORY_PREVIEW_COUNT} />
    );
  } else if (listEmpty) {
    body = (
      <Box twClassName="items-center py-4">
        <TabEmptyState
          icon={
            <AvatarIcon
              iconName={IconName.Activity}
              size={AvatarIconSize.Xl}
              severity={AvatarIconSeverity.Neutral}
              iconProps={{ color: IconColor.IconDefault }}
            />
          }
          description={localizedText.tradingActivityEmptyDescription}
          descriptionProps={{
            variant: TextVariant.BodyMd,
            color: TextColor.TextAlternative,
          }}
          actionButtonText={localizedText.tradingActivityEmptyAction}
          actionButtonProps={{
            variant: ButtonVariant.Primary,
            size: ButtonSize.Lg,
            twClassName: 'mt-3 self-stretch',
            testID: `${EARNINGS_TAB_TEST_IDS.HISTORY_EMPTY}-action`,
          }}
          onAction={onEmptyAction}
          testID={EARNINGS_TAB_TEST_IDS.HISTORY_EMPTY}
        />
      </Box>
    );
  } else {
    body = (
      <Box twClassName="gap-4" testID={EARNINGS_TAB_TEST_IDS.HISTORY}>
        {items.map((item) => (
          <EarningsHistoryRow
            key={
              isPendingClaimRow(item)
                ? `pending-${item.id}`
                : `${item.type}-${item.id}`
            }
            item={item}
            localizedText={localizedText}
          />
        ))}
      </Box>
    );
  }

  return (
    <>
      {followsSection ? <SectionDivider marginVertical={8} /> : null}
      <SectionHeader
        title={localizedText.history}
        isInteractive={!listEmpty}
        onPress={listEmpty ? undefined : onOpenList}
        twClassName={followsSection ? 'pt-0 pb-4' : 'pt-6 pb-4'}
        testID={EARNINGS_TAB_TEST_IDS.HISTORY_HEADER}
      />
      <Box twClassName="px-4 pb-8">{body}</Box>
    </>
  );
};

// ---------------------------------------------------------------------------
// Tab.
// ---------------------------------------------------------------------------

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
  const openTradeActions = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.TRADE_WALLET_ACTIONS,
    });
  }, [navigation]);
  const openHistory = useCallback(() => {
    navigateToRewardsRoute(navigation, Routes.REWARDS_EARNINGS_HISTORY_VIEW);
  }, [navigation]);
  const localizedText = useSelector((state: RootState) =>
    selectReferralMeLocalizedText(state, profileId),
  );
  const earningsSummaryEntry = useSelector((state: RootState) =>
    selectEarningsSummaryEntry(state, profileId),
  );
  const { fetchEarningsSummary } = useEarningsSummary(profileId);
  const retrySummary = useCallback(() => {
    void fetchEarningsSummary({ forceFresh: true });
  }, [fetchEarningsSummary]);
  const last7 = useLast7DaysEarnings(profileId);
  const historyList = useEarningsHistory(profileId);
  const inFlight = useInFlightClaims(profileId);
  const { claim, isClaiming } = useClaimEarnings(profileId, {
    variant,
    onOpened: () => {
      inFlight.refresh().catch(() => undefined);
    },
    onSubmitted: () =>
      fetchEarningsSummary({ forceFresh: true }).catch(() => undefined),
  });

  if (!localizedText) {
    return null;
  }

  const summary = deriveSummarySection(earningsSummaryEntry);
  const history = deriveHistorySection(historyList, inFlight.claims);
  const last7Loading = last7.isLoading && !last7.data;
  const last7Amount = last7.data ? musdAmount(last7.data.lifetime_total) : null;
  const errorSource = deriveErrorSource(
    summary.error,
    last7.error,
    history.error,
  );
  // Disable the breakdown for this pilot until the section is ready to show.
  const showBreakdown = false; // summary.show && rows.length > 0
  const rows = breakdownRows(variant, summary.data, localizedText);
  const claimEnabled = canClaimEarnings(summary.data, variant);

  return (
    <Box testID={EARNINGS_TAB_TEST_IDS.CONTAINER}>
      {/* Same block as the hero cards on Ways to Earn: the banner and the
          card share one padded box so the gap between them matches. */}
      {errorSource || summary.show ? (
        <Box twClassName="mt-3 gap-3 px-4 pt-4">
          {errorSource ? (
            <EarningsErrorBanner
              source={errorSource}
              summaryRefreshing={summary.refreshing}
              last7Refreshing={last7.isLoading}
              onRetrySummary={retrySummary}
              onRetryLast7={last7.retry}
              onRetryHistory={historyList.retry}
            />
          ) : null}
          {summary.show ? (
            <ClaimableRewardsCard
              localizedText={localizedText}
              claimable={summary.data?.claimable}
              claimed={
                variant === 'REFEREE' ? summary.data?.claimed : undefined
              }
              held={variant === 'REFEREE' ? summary.data?.held : undefined}
              claimableAmount={musdAmount(summary.data?.claimable)}
              heldAmount={
                variant === 'REFEREE'
                  ? musdAmount(summary.data?.held)
                  : undefined
              }
              recordedAmount={musdAmount(summary.data?.lifetime_total)}
              last7Amount={last7Amount}
              isSummaryLoading={summary.loading}
              isLast7Loading={last7Loading}
              canClaim={claimEnabled}
              isClaiming={isClaiming}
              onClaim={
                summary.data
                  ? () => {
                      const summaryData = summary.data;
                      if (!summaryData) {
                        return;
                      }
                      claim(summaryData).catch(() => undefined);
                    }
                  : undefined
              }
              onPaused={() => {
                navigation.navigate(Routes.MODAL.REWARDS_INFO_SHEET_MODAL, {
                  title: localizedText.claimsPausedTitle,
                  description: localizedText.claimsPausedDescription,
                });
              }}
            />
          ) : null}
        </Box>
      ) : null}
      {showBreakdown ? (
        <BreakdownSection
          localizedText={localizedText}
          rows={rows}
          loading={summary.loading}
          followsSection={summary.show}
          onViewPerformance={onViewPerformance}
        />
      ) : null}
      {history.show ? (
        <HistorySection
          localizedText={localizedText}
          state={history}
          followsSection={summary.show || showBreakdown}
          onEmptyAction={openTradeActions}
          onOpenList={openHistory}
        />
      ) : null}
    </Box>
  );
};

export default EarningsTab;

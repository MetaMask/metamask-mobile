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
  type MoneyDashboardPersona,
} from '../../../../../../reducers/rewardsMoney/selectors';
import type {
  ClaimDto,
  EarningsSummaryDto,
  LedgerEntryDto,
  ReferralLocalizedText,
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
  underReviewBlockedBaseUnits,
  selfEarnedLifetime,
} from '../../../utils/earningsSummaryTotals';
import { SHOW_TRADING_COMMISSIONS } from '../constants';
import ClaimableRewardsCard from '../ClaimableRewardsCard';
import type {
  ClaimsPausedLabels,
  ClaimsPausedTotals,
} from '../RewardsMoneyClaimsPausedModal';
import { EarningsHistoryRow } from '../EarningsHistoryRows';
import RewardsPausedBanner from '../RewardsPausedBanner';
import TradingActivityListSkeleton from '../TradingActivityListSkeleton';

import { EARNINGS_TAB_TEST_IDS } from './EarningsTab.testIds';

/** Rows shown under History before "see all". Matches the Performance preview. */
const EARNINGS_HISTORY_PREVIEW_COUNT = 5;

/** mUSD base units as a two-decimal amount, or a dash when there is none. */
const musdAmount = (baseUnits: string | null | undefined): string =>
  formatMusdBaseUnits(baseUnits, { maximumFractionDigits: 2 }) ?? '—';

/** Root summary amounts for the Claims paused sheet. */
function claimsPausedTotals(summary: EarningsSummaryDto): ClaimsPausedTotals {
  return {
    lifetime_total: summary.lifetime_total,
    claimable: summary.claimable,
    held: summary.held,
    blocked: summary.blocked,
    voided: summary.voided,
    pending: summary.pending,
    claimed: summary.claimed,
  };
}

/** Row copy, using the localized_text keys as they are. */
function claimsPausedLabels(
  localizedText: ReferralLocalizedText,
): ClaimsPausedLabels {
  return {
    breakdown: localizedText.breakdown,
    recordedEarningsLabel: localizedText.totalEarningsLabel,
    availableToClaim: localizedText.availableToClaim,
    held: localizedText.held,
    blocked: localizedText.blocked,
    voided: localizedText.voided,
    pending: localizedText.pending,
    claimed: localizedText.claimed,
  };
}

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
  const failed = Boolean(entry?.error);
  const loading = !data && (!entry || Boolean(entry.loading));
  // A failed refresh keeps the last summary. The banner is only for a failure
  // that left nothing to show, including while that retry is in flight.
  const error = failed && !data;
  return {
    data,
    loading,
    refreshing: Boolean(entry?.loading),
    error,
    show: !error && (loading || data !== null),
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
  const failed = Boolean(list.error);
  // Cached rows stay without a banner. The banner is the empty failure.
  const error = failed && items.length === 0;
  return {
    items,
    loading,
    error,
    show: !(error && !loading),
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
  description: string;
  amount: string;
}

function breakdownRows(
  persona: MoneyDashboardPersona,
  summary: EarningsSummaryDto | null,
  localizedText: ReferralLocalizedText,
): BreakdownRow[] {
  if (persona === 'plain') {
    return [];
  }

  const trading: BreakdownRow = {
    key: 'trading',
    iconName: IconName.Coin,
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
    iconName: IconName.Copy,
    label: localizedText.tradingCommissionsSection,
    description: localizedText.breakdownSocialDescription,
    amount: musdAmount(earnedByOthersLifetime(summary, 'SOCIAL_FOLLOW_TRADE')),
  };

  if (persona === 'referrer') {
    return [referrals, social];
  }

  return [trading, social];
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
              <Box twClassName="flex-1">
                <Text variant={TextVariant.BodyMd}>{row.label}</Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {row.description}
                </Text>
              </Box>
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
  /** Under-review base units from the summary, or null when none are held. */
  pausedBaseUnits: string | null;
  onEmptyAction: () => void;
  onOpenList: () => void;
}> = ({
  localizedText,
  state,
  followsSection,
  pausedBaseUnits,
  onEmptyAction,
  onOpenList,
}) => {
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
      <Box twClassName="px-4 pb-8">
        {pausedBaseUnits ? (
          <Box twClassName="mb-4">
            <RewardsPausedBanner
              baseUnits={pausedBaseUnits}
              localizedText={localizedText}
            />
          </Box>
        ) : null}
        {body}
      </Box>
    </>
  );
};

// ---------------------------------------------------------------------------
// Tab.
// ---------------------------------------------------------------------------

interface EarningsTabProps {
  profileId: string;
  persona: MoneyDashboardPersona;
  onViewPerformance?: () => void;
}

const EarningsTab: React.FC<EarningsTabProps> = ({
  profileId,
  persona,
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
  const openBalanceBreakdown = useCallback(
    (summaryData: EarningsSummaryDto) => {
      if (!localizedText) {
        return;
      }
      navigation.navigate(Routes.MODAL.REWARDS_MONEY_CLAIMS_PAUSED_MODAL, {
        variant: 'breakdown',
        title: localizedText.breakdown,
        totals: claimsPausedTotals(summaryData),
        labels: claimsPausedLabels(localizedText),
      });
    },
    [localizedText, navigation],
  );
  const openClaimsPaused = useCallback(
    (
      summaryData:
        | EarningsSummaryDto
        | undefined = earningsSummaryEntry?.data ?? undefined,
    ) => {
      if (!localizedText) {
        return;
      }
      navigation.navigate(Routes.MODAL.REWARDS_MONEY_CLAIMS_PAUSED_MODAL, {
        title: localizedText.claimsPausedTitle,
        description: localizedText.claimsPausedDescription,
        totals: summaryData ? claimsPausedTotals(summaryData) : undefined,
        labels: claimsPausedLabels(localizedText),
      });
    },
    [earningsSummaryEntry?.data, localizedText, navigation],
  );
  const retrySummary = useCallback(() => {
    void Promise.resolve(fetchEarningsSummary({ forceFresh: true })).catch(
      () => undefined,
    );
  }, [fetchEarningsSummary]);
  const last7 = useLast7DaysEarnings(profileId);
  const historyList = useEarningsHistory(profileId);
  const inFlight = useInFlightClaims(profileId);
  const { claim, isClaiming, isClaimWaiting } = useClaimEarnings(profileId, {
    persona,
    summary: earningsSummaryEntry?.data ?? null,
    onOpened: () => {
      inFlight.refresh({ forceFresh: true }).catch(() => undefined);
    },
    onSubmitted: async () => {
      const refreshed = await fetchEarningsSummary({ forceFresh: true });
      // No summary means this refresh did not finish. Claim stays disabled
      // until a later summary replaces the one it was pressed against.
      if (!refreshed) {
        throw new Error('Earnings summary refresh did not finish');
      }
    },
    onClaimsPaused: () => {
      // The sheet copies these totals into route params, so it has to open
      // with the summary this refresh returns. The selector still holds the
      // pre-refusal figures until the next render. A refresh that returns
      // nothing has not finished, so the sheet stays closed.
      void fetchEarningsSummary({ forceFresh: true })
        .then((summary) => {
          if (!summary) {
            return;
          }
          openClaimsPaused(summary);
        })
        .catch(() => {
          openClaimsPaused();
        });
    },
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
    last7.error && !last7.data,
    history.error,
  );
  const rows = breakdownRows(persona, summary.data, localizedText);
  const showBreakdown =
    summary.show && rows.length > 0 && SHOW_TRADING_COMMISSIONS;
  const claimEnabled = canClaimEarnings(summary.data, persona);

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
                persona === 'referee' ? summary.data?.claimed : undefined
              }
              held={persona === 'referee' ? summary.data?.held : undefined}
              blocked={
                persona === 'referee' ? summary.data?.blocked : undefined
              }
              claimableAmount={musdAmount(summary.data?.claimable)}
              isReferrer={persona === 'referrer'}
              recordedAmount={musdAmount(summary.data?.lifetime_total)}
              last7Amount={last7Amount}
              isSummaryLoading={summary.loading}
              isLast7Loading={last7Loading}
              canClaim={claimEnabled}
              isClaiming={isClaiming}
              isClaimWaiting={isClaimWaiting}
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
              onPaused={() => openClaimsPaused()}
              onBalanceBreakdown={
                summary.data
                  ? () => {
                      const summaryData = summary.data;
                      if (!summaryData) {
                        return;
                      }
                      openBalanceBreakdown(summaryData);
                    }
                  : undefined
              }
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
          pausedBaseUnits={
            summary.loading || history.loading
              ? null
              : underReviewBlockedBaseUnits(summary.data)
          }
          onEmptyAction={openTradeActions}
          onOpenList={openHistory}
        />
      ) : null}
    </Box>
  );
};

export default EarningsTab;

import React, { useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  Box,
  ButtonSize,
  ButtonVariant,
  IconColor,
  IconName,
  SectionDivider,
  SectionHeader,
  TabEmptyState,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import Routes from '../../../../../../constants/navigation/Routes';
import type { RootState } from '../../../../../../reducers';
import {
  isCopyTradingOnly,
  refereeMoneySections,
  selectEarningsSummaryEntry,
  selectReferralMeEntry,
  selectReferralMeLocalizedText,
  type MoneyDashboardPersona,
} from '../../../../../../reducers/rewardsMoney/selectors';
import { selectIsSocialV1Enabled } from '../../../../../../selectors/featureFlagController/socialV1';
import { selectRewardsSubscriptionId } from '../../../../../../selectors/rewards';
import { selectCandidateSubscriptionId } from '../../../../../../reducers/rewards/selectors';
import { useOpenSocialPostComposer } from '../../../../../Views/SocialLeaderboard/hooks/useOpenSocialPostComposer';
import type {
  ClaimDto,
  EarningsSummaryDto,
  LedgerEntryDto,
  ReferralLocalizedText,
} from '../../../../../../core/Engine/controllers/rewards-money-controller/types';
import { strings } from '../../../../../../../locales/i18n';
import { navigateToRewardsRoute } from '../../../utils';
import { useTaxDocumentation } from '../../../hooks/useTaxDocumentation';
import {
  canClaimEarnings,
  canSignEarningAddress,
  claimBlockedOnThisDevice,
  claimHasUnsignableAddress,
  claimRouteOptions,
  routesSignableOnDevice,
  displayClaimTotals,
  incomeHeldOnOpenRoute,
  isPendingClaimRow,
  mergeInFlightClaims,
  type EarningsHistoryListItem,
} from '../../../utils/claimEarnings';
import RewardsErrorBanner from '../../RewardsErrorBanner';
import type { UseCursorPaginatedListResult } from '../../../hooks/useCursorPaginatedList';
import { useEarningsSummary } from '../../../hooks/useEarningsSummary';
import { useEarningsHistory } from '../../../hooks/useEarningsHistory';
import { useRewardCampaigns } from '../../../hooks/useRewardCampaigns';
import { useClaimEarnings } from '../../../hooks/useClaimEarnings';
import { useClaimMechanisms } from '../../../hooks/useFollowTradeClaimOpen';
import { selectInternalAccounts } from '../../../../../../selectors/accountsController';
import { useInFlightClaims } from '../../../hooks/useInFlightClaims';
import { underReviewBlockedBaseUnits } from '../../../utils/earningsSummaryTotals';
import { isShareableReferralCode } from '../../../utils/shareableReferralCode';
import ClaimableRewardsCard from '../ClaimableRewardsCard';
import type {
  ClaimsPausedLabels,
  ClaimsPausedTotals,
} from '../RewardsMoneyClaimsPausedModal';
import { EarningsHistoryRow } from '../EarningsHistoryRows';
import RewardsPausedBanner from '../RewardsPausedBanner';
import TradingActivityListSkeleton from '../TradingActivityListSkeleton';

import {
  earnActionRows,
  type EarnActionRow,
  type EarnActionRowKey,
} from './earnActionRows';
import EarnActionSection from './EarnActionSection';
import {
  campaignActionRow,
  campaignDetailsRoute,
  latestOpenableCampaign,
  NEXT_STEP_CAMPAIGN_KEY,
  optInActionRow,
} from './nextStepCampaign';
import { EARN_ACTION_SECTION_TEST_IDS } from './EarnActionSection.testIds';
import {
  deriveSummarySection,
  musdAmount,
  musdMinimumAmount,
} from './earningsSummarySection';
import { WAYS_TO_EARN_TAB_TEST_IDS } from './WaysToEarnTab.testIds';

/** Rows shown under History before "see all". */
const HISTORY_PREVIEW_COUNT = 5;

/**
 * Sheet rows. Available and Pending use the display split. Held and blocked
 * stay the summary values so the rows still add up to the lifetime total.
 */
function claimsPausedTotals(summary: EarningsSummaryDto): ClaimsPausedTotals {
  const display = displayClaimTotals(summary);
  return {
    lifetime_total: summary.lifetime_total,
    claimable: display.claimable,
    held: summary.held,
    blocked: summary.blocked,
    voided: summary.voided,
    pending: display.pending,
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
// Derived state. The history list reduces to the same questions the summary
// does: is it loading, did it fail, should its section render.
// ---------------------------------------------------------------------------

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
    HISTORY_PREVIEW_COUNT,
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
// Error banner. One per tab: the unwindowed summary wins, then history, and
// retry refetches only that source.
// ---------------------------------------------------------------------------

type ErrorSource = 'summary' | 'history';

function deriveErrorSource(
  summaryError: boolean,
  historyError: boolean,
): ErrorSource | null {
  if (summaryError) {
    return 'summary';
  }
  if (historyError) {
    return 'history';
  }
  return null;
}

const EarningsErrorBanner: React.FC<{
  source: ErrorSource;
  summaryRefreshing: boolean;
  onRetrySummary: () => void;
  onRetryHistory: () => void;
}> = ({ source, summaryRefreshing, onRetrySummary, onRetryHistory }) => {
  const copy =
    source === 'history'
      ? 'rewards.trading_activity_error'
      : 'rewards.earnings_summary_error';
  const retry = {
    summary: onRetrySummary,
    history: onRetryHistory,
  }[source];
  const refreshing = {
    summary: summaryRefreshing,
    history: false,
  }[source];
  const testID = {
    summary: WAYS_TO_EARN_TAB_TEST_IDS.SUMMARY_ERROR,
    history: WAYS_TO_EARN_TAB_TEST_IDS.HISTORY_ERROR,
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
// History section: a header that opens the full list while there are rows,
// then a skeleton, an empty state, or the preview rows.
// ---------------------------------------------------------------------------

const HistorySection: React.FC<{
  localizedText: ReferralLocalizedText;
  state: HistorySectionState;
  /** A section above this one supplies the divider and header spacing. */
  followsSection: boolean;
  /** Copy-trading-only sharers get the copy-trading empty copy and action. */
  copyTradingOnly: boolean;
  /** Under-review base units from the summary, or null when none are held. */
  pausedBaseUnits: string | null;
  onEmptyAction: () => void;
  onOpenList: () => void;
}> = ({
  localizedText,
  state,
  followsSection,
  copyTradingOnly,
  pausedBaseUnits,
  onEmptyAction,
  onOpenList,
}) => {
  const { items, loading, listEmpty } = state;

  let body: React.ReactElement;
  if (loading) {
    body = <TradingActivityListSkeleton rows={HISTORY_PREVIEW_COUNT} />;
  } else if (listEmpty) {
    body = (
      <Box twClassName="items-center py-4">
        <TabEmptyState
          icon={
            <AvatarIcon
              iconName={copyTradingOnly ? IconName.People : IconName.Activity}
              size={AvatarIconSize.Xl}
              severity={AvatarIconSeverity.Neutral}
              iconProps={{ color: IconColor.IconDefault }}
            />
          }
          description={
            copyTradingOnly
              ? localizedText.copyTradingEmptyDescription
              : localizedText.tradingActivityEmptyDescription
          }
          descriptionProps={{
            variant: TextVariant.BodyMd,
            color: TextColor.TextAlternative,
          }}
          actionButtonText={
            copyTradingOnly
              ? localizedText.copyTradingEmptyAction
              : localizedText.tradingActivityEmptyAction
          }
          actionButtonProps={{
            variant: ButtonVariant.Primary,
            size: ButtonSize.Lg,
            twClassName: 'mt-3 self-stretch',
            testID: `${WAYS_TO_EARN_TAB_TEST_IDS.HISTORY_EMPTY}-action`,
          }}
          onAction={onEmptyAction}
          testID={WAYS_TO_EARN_TAB_TEST_IDS.HISTORY_EMPTY}
        />
      </Box>
    );
  } else {
    body = (
      <Box twClassName="gap-4" testID={WAYS_TO_EARN_TAB_TEST_IDS.HISTORY}>
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
        twClassName={followsSection ? 'pt-0 pb-4' : 'pt-4 pb-4'}
        testID={WAYS_TO_EARN_TAB_TEST_IDS.HISTORY_HEADER}
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

/** Every row Next steps can hold: the shared ways to earn, then a campaign. */
type NextStepRowKey = EarnActionRowKey | typeof NEXT_STEP_CAMPAIGN_KEY;

interface WaysToEarnTabProps {
  profileId: string;
  persona: MoneyDashboardPersona;
  /** Opens the share code sheet the dashboard owns. */
  onOpenShareCode: () => void;
  /** Switches the dashboard to its Campaigns tab. */
  onOpenCampaigns: () => void;
}

const WaysToEarnTab: React.FC<WaysToEarnTabProps> = ({
  profileId,
  persona,
  onOpenShareCode,
  onOpenCampaigns,
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
  const { followTradeClaimOpen, revShareClaimOpen } =
    useClaimMechanisms(profileId);
  const referralMe = useSelector(
    (state: RootState) => selectReferralMeEntry(state, profileId)?.data,
  );
  const roles = referralMe?.roles;
  // Refer friends opens the share sheet, so it needs the same shareable code
  // the header Share button needs.
  const canShareCode = isShareableReferralCode(
    referralMe?.referral_code,
    referralMe?.referral_code_status,
  );
  const copyTradingOnly = isCopyTradingOnly(roles);
  const { openComposer } = useOpenSocialPostComposer();
  const openComposerPress = useCallback(() => {
    openComposer();
  }, [openComposer]);
  const socialEnabled = useSelector(selectIsSocialV1Enabled);
  const {
    categorizedCampaigns: { active: activeCampaigns },
  } = useRewardCampaigns();
  const liveCampaign = latestOpenableCampaign(activeCampaigns);
  // A user who has opted into rewards goes straight to the campaign. Anyone
  // else lands on the Campaigns tab, where the opt-in is offered.
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  // selectRewardsSubscriptionId reads null while the subscription lookup is
  // still 'pending' or 'retry'. Wait for it, so a subscribed user is never
  // offered the opt-in row.
  const candidateSubscriptionId = useSelector(selectCandidateSubscriptionId);
  const subscriptionKnown =
    Boolean(subscriptionId) ||
    (candidateSubscriptionId !== 'pending' &&
      candidateSubscriptionId !== 'retry');
  const openNextStep = useCallback(
    (key: NextStepRowKey) => {
      if (key === 'referrals') {
        onOpenShareCode();
      } else if (key === 'trading') {
        openTradeActions();
      } else if (key === NEXT_STEP_CAMPAIGN_KEY) {
        const route = liveCampaign ? campaignDetailsRoute(liveCampaign) : null;
        if (subscriptionId && liveCampaign && route) {
          navigateToRewardsRoute(navigation, route, {
            campaignId: liveCampaign.id,
          });
        } else {
          onOpenCampaigns();
        }
      } else {
        openComposerPress();
      }
    },
    [
      liveCampaign,
      navigation,
      onOpenCampaigns,
      onOpenShareCode,
      openComposerPress,
      openTradeActions,
      subscriptionId,
    ],
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
  const historyList = useEarningsHistory(profileId);
  const inFlight = useInFlightClaims(profileId);
  const { prefetchTaxMe, onClaimPress, openAfterClaimRefusal } =
    useTaxDocumentation(profileId);
  useFocusEffect(
    useCallback(() => {
      prefetchTaxMe();
    }, [prefetchTaxMe]),
  );
  const { claim, isClaiming, isClaimWaiting, claimWaitCaption } =
    useClaimEarnings(profileId, {
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
      onTaxRequired: () => {
        void openAfterClaimRefusal().catch(() => {
          openClaimsPaused();
        });
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
  // Subscribing re-renders this screen when the account list changes (an
  // import), which re-runs the sign check below. Signing itself stays the
  // claim runner's keyring check, hardware and snap included.
  useSelector(selectInternalAccounts);
  const signRouteOptions = claimRouteOptions(
    localizedText?.taxFormUrl,
    followTradeClaimOpen,
    revShareClaimOpen,
  );
  const earnedElsewhere =
    Boolean(localizedText?.earnedOnOtherAccounts) &&
    claimHasUnsignableAddress(
      earningsSummaryEntry?.data,
      signRouteOptions,
      canSignEarningAddress,
    );
  const claimBlockedOnDevice =
    Boolean(localizedText?.earnedOnOtherAccounts) &&
    claimBlockedOnThisDevice(
      earningsSummaryEntry?.data,
      signRouteOptions,
      canSignEarningAddress,
    );
  // Same sign check as the button. A later cashback-only press must not
  // treat an unsignable cashback balance as something this phone can pay.
  const cashbackSignableOnDevice = routesSignableOnDevice(
    earningsSummaryEntry?.data,
    ['referral-trade-fee-cashback'],
    canSignEarningAddress,
  ).includes('referral-trade-fee-cashback');

  if (!localizedText) {
    return null;
  }

  const summary = deriveSummarySection(earningsSummaryEntry);
  const history = deriveHistorySection(historyList, inFlight.claims);
  const errorSource = deriveErrorSource(summary.error, history.error);
  const display = displayClaimTotals(summary.data);
  const routeOptions = claimRouteOptions(
    localizedText?.taxFormUrl,
    followTradeClaimOpen,
    revShareClaimOpen,
  );
  const claimEnabled = canClaimEarnings(summary.data, routeOptions);
  const taxHeld = incomeHeldOnOpenRoute(summary.data, routeOptions);
  // A subscribed user is offered the live campaign. A user who has not opted
  // in is offered the opt-in instead, once the subscription lookup settles.
  let campaignRows: EarnActionRow<NextStepRowKey>[] = [];
  if (subscriptionId) {
    campaignRows = liveCampaign ? [campaignActionRow(liveCampaign)] : [];
  } else if (subscriptionKnown) {
    campaignRows = [optInActionRow(localizedText)];
  }
  const nextStepRows: EarnActionRow<NextStepRowKey>[] = [
    ...earnActionRows(
      persona,
      localizedText,
      refereeMoneySections(roles),
      socialEnabled,
    ).filter((row) => row.key !== 'referrals' || canShareCode),
    ...campaignRows,
  ];

  return (
    <Box testID={WAYS_TO_EARN_TAB_TEST_IDS.CONTAINER}>
      {/* The banner and the card share one padded box so the gap between
          them matches. */}
      {errorSource || summary.show ? (
        <Box twClassName="gap-3 px-4 pt-4">
          {errorSource ? (
            <EarningsErrorBanner
              source={errorSource}
              summaryRefreshing={summary.refreshing}
              onRetrySummary={retrySummary}
              onRetryHistory={historyList.retry}
            />
          ) : null}
          {summary.show ? (
            <ClaimableRewardsCard
              localizedText={localizedText}
              claimable={display.claimable}
              pending={display.pending}
              claimed={summary.data?.claimed}
              held={summary.data?.held}
              blocked={summary.data?.blocked}
              claimableAmount={musdAmount(display.claimable)}
              pendingAmount={musdAmount(display.pending)}
              minimumAmount={musdMinimumAmount(
                summary.data?.minimum_musd_base_units,
              )}
              heldAmount={musdAmount(summary.data?.held)}
              recordedAmount={musdAmount(summary.data?.lifetime_total)}
              isSummaryLoading={summary.loading}
              canClaim={claimEnabled}
              taxHeld={taxHeld}
              isClaiming={isClaiming}
              isClaimWaiting={isClaimWaiting}
              claimWaitCaption={claimWaitCaption ?? undefined}
              earnedElsewhereCaption={
                earnedElsewhere
                  ? localizedText.earnedOnOtherAccounts
                  : undefined
              }
              claimBlockedOnDevice={claimBlockedOnDevice}
              onClaim={
                summary.data
                  ? () => {
                      const summaryData = summary.data;
                      if (!summaryData) {
                        return;
                      }
                      void onClaimPress(
                        summaryData,
                        (options) =>
                          claim(options?.summary ?? summaryData, options).catch(
                            () => undefined,
                          ),
                        { cashbackSignableOnDevice },
                      );
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
      {nextStepRows.length > 0 ? (
        <EarnActionSection
          title={localizedText.nextSteps}
          rows={nextStepRows}
          onPressRow={openNextStep}
          followsSection={summary.show}
          testIDs={{
            container: EARN_ACTION_SECTION_TEST_IDS.NEXT_STEPS,
            header: EARN_ACTION_SECTION_TEST_IDS.NEXT_STEPS_HEADER,
            row: EARN_ACTION_SECTION_TEST_IDS.NEXT_STEPS_ROW,
          }}
        />
      ) : null}
      {history.show ? (
        <HistorySection
          localizedText={localizedText}
          state={history}
          followsSection={summary.show || nextStepRows.length > 0}
          copyTradingOnly={copyTradingOnly}
          pausedBaseUnits={
            summary.loading || history.loading
              ? null
              : underReviewBlockedBaseUnits(summary.data)
          }
          onEmptyAction={copyTradingOnly ? openComposerPress : openTradeActions}
          onOpenList={openHistory}
        />
      ) : null}
    </Box>
  );
};

export default WaysToEarnTab;

import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
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
import type { ReferralFunnelEntry } from '../../../../../../reducers/rewardsMoney';
import {
  selectReferralFunnelEntry,
  selectReferralMeLocalizedText,
} from '../../../../../../reducers/rewardsMoney/selectors';
import type {
  ReferralFunnelDto,
  ReferralLocalizedText,
} from '../../../../../../core/Engine/controllers/rewards-money-controller/types';
import { strings } from '../../../../../../../locales/i18n';
import { navigateToRewardsRoute } from '../../../utils';
import RewardsErrorBanner from '../../RewardsErrorBanner';
import type { UseCursorPaginatedListResult } from '../../../hooks/useCursorPaginatedList';
import { useReferralFunnel } from '../../../hooks/useReferralFunnel';
import { useCommissions } from '../../../hooks/useCommissions';
import { useCashbackLedger } from '../../../hooks/useCashbackLedger';
import ReferralFunnelBar from '../ReferralFunnelBar';
import TradingActivityListSkeleton from '../TradingActivityListSkeleton';
import {
  PerformanceCommissionRow,
  PerformanceRebateRow,
} from '../PerformanceActivityRows';

/** Rows shown under each Performance section before "see all". */
const PERFORMANCE_PREVIEW_COUNT = 5;

export const PERFORMANCE_TAB_TEST_IDS = {
  CONTAINER: 'rewards-money-performance-tab',
  FUNNEL: 'rewards-money-performance-funnel',
  FUNNEL_BAR: 'rewards-money-performance-funnel-bar',
  COMMISSIONS: 'rewards-money-performance-commissions',
  COMMISSIONS_HEADER: 'rewards-money-performance-commissions-header',
  COMMISSIONS_DIVIDER: 'rewards-money-performance-commissions-divider',
  REBATES: 'rewards-money-performance-rebates',
  REBATES_HEADER: 'rewards-money-performance-rebates-header',
  REBATES_DIVIDER: 'rewards-money-performance-rebates-divider',
  FUNNEL_SKELETON: 'rewards-money-performance-funnel-skeleton',
  FUNNEL_ERROR: 'rewards-money-performance-funnel-error',
  COMMISSIONS_ERROR: 'rewards-money-performance-commissions-error',
  COMMISSIONS_EMPTY: 'rewards-money-performance-commissions-empty',
  REBATES_ERROR: 'rewards-money-performance-rebates-error',
  REBATES_EMPTY: 'rewards-money-performance-rebates-empty',
} as const;

// ---------------------------------------------------------------------------
// Derived state. Each source (funnel, commissions, rebates) reduces to the
// same questions: is it loading, did it fail, should its section render.
// ---------------------------------------------------------------------------

interface FunnelSectionState {
  data: ReferralFunnelDto | undefined;
  loading: boolean;
  refreshing: boolean;
  error: boolean;
  show: boolean;
}

function deriveFunnelSection(
  enabled: boolean,
  entry: ReferralFunnelEntry | undefined,
): FunnelSectionState {
  const data = entry?.data;
  const error = enabled && Boolean(entry?.error);
  const loading = enabled && !data && (!entry || Boolean(entry.loading));
  return {
    data,
    loading,
    refreshing: Boolean(entry?.loading),
    error,
    // Hidden only when the request failed with nothing cached to show.
    show: enabled && !(error && !data),
  };
}

interface ActivitySectionState<T> {
  items: T[];
  loading: boolean;
  error: boolean;
  show: boolean;
  listEmpty: boolean;
}

function deriveActivitySection<T>(
  enabled: boolean,
  list: UseCursorPaginatedListResult<T>,
): ActivitySectionState<T> {
  const items = (list.items ?? []).slice(0, PERFORMANCE_PREVIEW_COUNT);
  const loading = enabled && list.isLoading && !list.items;
  const error = enabled && Boolean(list.error);
  return {
    items,
    loading,
    error,
    // Hidden only when the request failed with nothing cached to show.
    show: enabled && !(error && items.length === 0 && !loading),
    listEmpty: !loading && items.length === 0,
  };
}

// ---------------------------------------------------------------------------
// Error banner. One per tab: commissions win when more than one request
// failed, and retry refetches only that source.
// ---------------------------------------------------------------------------

type ErrorSource = 'commissions' | 'rebates' | 'funnel';

const PerformanceErrorBanner: React.FC<{
  commissionsError: boolean;
  rebatesError: boolean;
  funnelError: boolean;
  funnelRefreshing: boolean;
  onRetryCommissions: () => void;
  onRetryRebates: () => void;
  onRetryFunnel: () => void;
}> = ({
  commissionsError,
  rebatesError,
  funnelError,
  funnelRefreshing,
  onRetryCommissions,
  onRetryRebates,
  onRetryFunnel,
}) => {
  let source: ErrorSource | null = null;
  if (commissionsError) {
    source = 'commissions';
  } else if (rebatesError) {
    source = 'rebates';
  } else if (funnelError) {
    source = 'funnel';
  }
  if (!source) {
    return null;
  }

  const copy =
    source === 'funnel'
      ? 'rewards.referral_details_error'
      : 'rewards.trading_activity_error';
  const retry = {
    commissions: onRetryCommissions,
    rebates: onRetryRebates,
    funnel: onRetryFunnel,
  }[source];
  const testID = {
    commissions: PERFORMANCE_TAB_TEST_IDS.COMMISSIONS_ERROR,
    rebates: PERFORMANCE_TAB_TEST_IDS.REBATES_ERROR,
    funnel: PERFORMANCE_TAB_TEST_IDS.FUNNEL_ERROR,
  }[source];

  return (
    <Box twClassName="mt-3 px-4 pt-4">
      <RewardsErrorBanner
        title={strings(`${copy}.error_fetching_title`)}
        description={strings(`${copy}.error_fetching_description`)}
        onConfirm={retry}
        confirmButtonLabel={strings(`${copy}.retry_button`)}
        onConfirmLoading={source === 'funnel' && funnelRefreshing}
        testID={testID}
      />
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Referrals funnel section.
// ---------------------------------------------------------------------------

const FUNNEL_SKELETON_ROWS = [
  { title: 'w-40', bar: 'w-full', description: 'w-56' },
  { title: 'w-36', bar: 'w-2/3', description: 'w-48' },
] as const;

const ReferralFunnelSkeleton: React.FC = () => {
  const tw = useTailwind();

  return (
    <Box twClassName="gap-5" testID={PERFORMANCE_TAB_TEST_IDS.FUNNEL_SKELETON}>
      {FUNNEL_SKELETON_ROWS.map((row) => (
        <Box key={row.title}>
          <Box
            flexDirection={BoxFlexDirection.Row}
            justifyContent={BoxJustifyContent.Between}
          >
            <Skeleton style={tw.style(`h-4 ${row.title} rounded-md`)} />
            <Skeleton style={tw.style('h-4 w-6 rounded-md')} />
          </Box>
          <Skeleton style={tw.style(`mt-2 h-2 ${row.bar} rounded-full`)} />
          <Skeleton
            style={tw.style(`mt-1 h-3 ${row.description} rounded-md`)}
          />
        </Box>
      ))}
    </Box>
  );
};

const FunnelSection: React.FC<{
  localizedText: ReferralLocalizedText;
  funnel: ReferralFunnelDto | undefined;
  loading: boolean;
}> = ({ localizedText, funnel, loading }) => {
  const funnelMax = Math.max(funnel?.enrolled ?? 0, 1);
  const rows = funnel
    ? [
        {
          key: 'confirmed',
          value: funnel.enrolled,
          title: localizedText.funnelConfirmed,
          description: localizedText.funnelConfirmedDescription,
        },
        {
          key: 'feeGenerating',
          value: funnel.earning_generating,
          title: localizedText.funnelFeeGenerating,
          description: localizedText.funnelFeeGeneratingDescription,
        },
      ]
    : [];

  return (
    <>
      <SectionHeader title={localizedText.referrals} twClassName="pt-6 pb-4">
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {localizedText.last30DaysUpdatedDaily}
        </Text>
      </SectionHeader>
      <Box twClassName="px-4">
        {loading ? <ReferralFunnelSkeleton /> : null}
        {funnel ? (
          <Box twClassName="gap-5" testID={PERFORMANCE_TAB_TEST_IDS.FUNNEL}>
            {rows.map((row, index) => (
              <Box key={row.key}>
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  justifyContent={BoxJustifyContent.Between}
                >
                  <Text variant={TextVariant.BodyMd}>{row.title}</Text>
                  <Text variant={TextVariant.BodyMd}>{row.value}</Text>
                </Box>
                <ReferralFunnelBar
                  ratio={row.value / funnelMax}
                  index={index}
                  testID={`${PERFORMANCE_TAB_TEST_IDS.FUNNEL_BAR}-${row.key}`}
                />
                <Text
                  variant={TextVariant.BodyXs}
                  color={TextColor.TextMuted}
                  twClassName="mt-1"
                >
                  {row.description}
                </Text>
              </Box>
            ))}
          </Box>
        ) : null}
      </Box>
    </>
  );
};

// ---------------------------------------------------------------------------
// Activity section, shared by commissions and rebates: a header that opens
// the full list while there are rows, then a skeleton, an empty state, or
// the preview rows.
// ---------------------------------------------------------------------------

interface ActivitySectionTestIds {
  header: string;
  divider: string;
  list: string;
  empty: string;
}

function ActivitySection<T extends { id: string }>({
  title,
  testIDs,
  state,
  followsSection,
  bottomPadding,
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  onOpenList,
  renderItem,
}: {
  title: string;
  testIDs: ActivitySectionTestIds;
  state: ActivitySectionState<T>;
  /** A section above this one supplies the divider and header spacing. */
  followsSection: boolean;
  /** The last section pads the bottom of the tab. */
  bottomPadding?: boolean;
  emptyDescription: string;
  /** The empty state renders a button only with both label and handler. */
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  onOpenList: () => void;
  renderItem: (item: T) => React.ReactElement;
}): React.ReactElement {
  const { items, loading, listEmpty } = state;

  let body: React.ReactElement;
  if (loading) {
    body = <TradingActivityListSkeleton rows={PERFORMANCE_PREVIEW_COUNT} />;
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
          description={emptyDescription}
          descriptionProps={{
            variant: TextVariant.BodyMd,
            color: TextColor.TextAlternative,
          }}
          {...(emptyActionLabel && onEmptyAction
            ? {
                actionButtonText: emptyActionLabel,
                actionButtonProps: {
                  variant: ButtonVariant.Primary,
                  size: ButtonSize.Lg,
                  twClassName: 'mt-3 self-stretch',
                  testID: `${testIDs.empty}-action`,
                },
                onAction: onEmptyAction,
              }
            : {})}
          testID={testIDs.empty}
        />
      </Box>
    );
  } else {
    body = (
      <Box twClassName="gap-4" testID={testIDs.list}>
        {items.map(renderItem)}
      </Box>
    );
  }

  return (
    <>
      {followsSection ? (
        <SectionDivider marginVertical={8} testID={testIDs.divider} />
      ) : null}
      <SectionHeader
        title={title}
        isInteractive={!listEmpty}
        onPress={listEmpty ? undefined : onOpenList}
        twClassName={followsSection ? 'pt-0 pb-4' : 'pt-6 pb-4'}
        testID={testIDs.header}
      />
      <Box twClassName={bottomPadding ? 'px-4 pb-8' : 'px-4'}>{body}</Box>
    </>
  );
}

// ---------------------------------------------------------------------------
// Tab.
// ---------------------------------------------------------------------------

interface PerformanceTabProps {
  profileId: string;
  variant: 'REFERRER' | 'REFEREE' | 'NONE';
}

const PerformanceTab: React.FC<PerformanceTabProps> = ({
  profileId,
  variant,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const isReferrer = variant === 'REFERRER';
  const isReferee = variant === 'REFEREE';
  // Disable commissions for this pilot until the section is ready to show.
  const showCommissions = false; // isReferrer || isReferee;
  const localizedText = useSelector((state: RootState) =>
    selectReferralMeLocalizedText(state, profileId),
  );
  const funnelEntry = useSelector((state: RootState) =>
    selectReferralFunnelEntry(state, profileId),
  );
  const { fetchReferralFunnel } = useReferralFunnel(profileId, {
    enabled: isReferrer,
  });
  const commissionsList = useCommissions(profileId, {
    enabled: showCommissions,
  });
  const rebatesList = useCashbackLedger(profileId, { enabled: isReferee });
  const openTradeActions = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.TRADE_WALLET_ACTIONS,
    });
  }, [navigation]);

  if (!localizedText) {
    return null;
  }

  const funnel = deriveFunnelSection(isReferrer, funnelEntry);
  const commissions = deriveActivitySection(showCommissions, commissionsList);
  const rebates = deriveActivitySection(isReferee, rebatesList);

  return (
    <Box testID={PERFORMANCE_TAB_TEST_IDS.CONTAINER}>
      <PerformanceErrorBanner
        commissionsError={commissions.error}
        rebatesError={rebates.error}
        funnelError={funnel.error}
        funnelRefreshing={funnel.refreshing}
        onRetryCommissions={commissionsList.retry}
        onRetryRebates={rebatesList.retry}
        onRetryFunnel={() => fetchReferralFunnel({ forceFresh: true })}
      />
      {funnel.show ? (
        <FunnelSection
          localizedText={localizedText}
          funnel={funnel.data}
          loading={funnel.loading}
        />
      ) : null}
      {commissions.show ? (
        <ActivitySection
          title={
            isReferrer
              ? localizedText.tradeCommissions
              : localizedText.tradingCommissionsSection
          }
          testIDs={{
            header: PERFORMANCE_TAB_TEST_IDS.COMMISSIONS_HEADER,
            divider: PERFORMANCE_TAB_TEST_IDS.COMMISSIONS_DIVIDER,
            list: PERFORMANCE_TAB_TEST_IDS.COMMISSIONS,
            empty: PERFORMANCE_TAB_TEST_IDS.COMMISSIONS_EMPTY,
          }}
          state={commissions}
          followsSection={funnel.show}
          emptyDescription={localizedText.tradingActivityEmptyDescription}
          onOpenList={() =>
            navigateToRewardsRoute(
              navigation,
              Routes.REWARDS_TRADING_COMMISSIONS_VIEW,
            )
          }
          renderItem={(item) => (
            <PerformanceCommissionRow
              key={item.id}
              item={item}
              localizedText={localizedText}
            />
          )}
        />
      ) : null}
      {rebates.show ? (
        <ActivitySection
          title={localizedText.tradingRebates}
          testIDs={{
            header: PERFORMANCE_TAB_TEST_IDS.REBATES_HEADER,
            divider: PERFORMANCE_TAB_TEST_IDS.REBATES_DIVIDER,
            list: PERFORMANCE_TAB_TEST_IDS.REBATES,
            empty: PERFORMANCE_TAB_TEST_IDS.REBATES_EMPTY,
          }}
          state={rebates}
          followsSection={commissions.show}
          bottomPadding
          emptyDescription={localizedText.tradingActivityEmptyDescription}
          emptyActionLabel={localizedText.tradingActivityEmptyAction}
          onEmptyAction={openTradeActions}
          onOpenList={() =>
            navigateToRewardsRoute(
              navigation,
              Routes.REWARDS_TRADING_REBATES_VIEW,
            )
          }
          renderItem={(item) => (
            <PerformanceRebateRow
              key={item.id}
              item={item}
              localizedText={localizedText}
            />
          )}
        />
      ) : null}
    </Box>
  );
};

export default PerformanceTab;

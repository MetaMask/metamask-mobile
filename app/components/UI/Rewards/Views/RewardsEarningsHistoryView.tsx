import React, { useCallback, useMemo } from 'react';
import { Box, IconName } from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../reducers';
import {
  isCopyTradingOnly,
  selectEarningsSummaryEntry,
  selectReferralMeEntry,
  selectReferralMeLocalizedText,
} from '../../../../reducers/rewardsMoney/selectors';
import { useOpenSocialPostComposer } from '../../../Views/SocialLeaderboard/hooks/useOpenSocialPostComposer';
import { selectSessionProfileId } from '../../../../selectors/identity';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import {
  isPendingClaimRow,
  mergeInFlightClaims,
  type EarningsHistoryListItem,
} from '../utils/claimEarnings';
import { EarningsHistoryRow } from '../components/Money/EarningsHistoryRows';
import RewardsEarningsBanners from '../components/Money/RewardsEarningsBanners';
import RewardsMoneyListScreen from '../components/Money/RewardsMoneyListScreen';
import TradingActivityListView from '../components/Money/TradingActivityListView';
import { useEarningsHistory } from '../hooks/useEarningsHistory';
import { useEarningsSummary } from '../hooks/useEarningsSummary';
import { useInFlightClaims } from '../hooks/useInFlightClaims';
import { REWARDS_EARNINGS_HISTORY_VIEW_TEST_IDS } from './RewardsEarningsHistoryView.testIds';

const RewardsEarningsHistoryView: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const profileId = useSelector(selectSessionProfileId);
  const localizedText = useSelector((state: RootState) =>
    selectReferralMeLocalizedText(state, profileId),
  );
  const earningsSummaryEntry = useSelector((state: RootState) =>
    selectEarningsSummaryEntry(state, profileId),
  );
  const roles = useSelector(
    (state: RootState) => selectReferralMeEntry(state, profileId)?.data?.roles,
  );
  const copyTradingOnly = isCopyTradingOnly(roles);
  useEarningsSummary(profileId);
  const list = useEarningsHistory(profileId);
  const openTradeActions = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.TRADE_WALLET_ACTIONS,
    });
  }, [navigation]);
  const { openComposer } = useOpenSocialPostComposer();
  const openComposerPress = useCallback(() => {
    openComposer();
  }, [openComposer]);
  const inFlight = useInFlightClaims(profileId);
  const items = useMemo(
    () => mergeInFlightClaims(list.items, inFlight.claims),
    [list.items, inFlight.claims],
  );

  const summaryData = earningsSummaryEntry?.data;
  // The Earnings tab waits for both reads. This header is drawn above the
  // first-load skeleton, so it stays off until the summary and the history
  // page have both settled.
  const summaryLoading =
    !summaryData &&
    (!earningsSummaryEntry || Boolean(earningsSummaryEntry.loading));
  const historyFirstLoad = list.isLoading || list.items === null;
  const bannerSummary = summaryLoading || historyFirstLoad ? null : summaryData;
  const header = (
    <Box twClassName="pt-2">
      {localizedText ? (
        <RewardsEarningsBanners
          summary={bannerSummary}
          localizedText={localizedText}
          twClassName="px-4 pb-4"
        />
      ) : null}
    </Box>
  );

  const renderItem = useCallback(
    (item: EarningsHistoryListItem) =>
      localizedText ? (
        <EarningsHistoryRow item={item} localizedText={localizedText} />
      ) : null,
    [localizedText],
  );

  return (
    <RewardsMoneyListScreen
      view="RewardsEarningsHistoryView"
      title={localizedText?.history ?? ''}
      testID={REWARDS_EARNINGS_HISTORY_VIEW_TEST_IDS.CONTAINER}
    >
      <TradingActivityListView
        testIDs={REWARDS_EARNINGS_HISTORY_VIEW_TEST_IDS}
        list={{ ...list, items }}
        renderItem={renderItem}
        keyExtractor={(item) =>
          isPendingClaimRow(item)
            ? `pending-${item.id}`
            : `${item.type}-${item.id}`
        }
        emptyDescription={
          (copyTradingOnly
            ? localizedText?.copyTradingEmptyDescription
            : localizedText?.tradingActivityEmptyDescription) ?? ''
        }
        emptyActionLabel={
          copyTradingOnly
            ? localizedText?.copyTradingEmptyAction
            : localizedText?.tradingActivityEmptyAction
        }
        emptyIconName={copyTradingOnly ? IconName.People : IconName.Activity}
        emptyOnAction={copyTradingOnly ? openComposerPress : openTradeActions}
        header={header}
      />
    </RewardsMoneyListScreen>
  );
};

export default RewardsEarningsHistoryView;

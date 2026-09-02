import React, { useCallback, useMemo, useState } from 'react';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type ParamListBase,
  type RouteProp,
} from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import ErrorBoundary from '../../../../Views/ErrorBoundary';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { EarningOriginType } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import {
  REFERRAL_PROGRAM_EARN_ORIGIN_TYPES,
  REWARDS_MONEY_TEST_IDS,
} from '../../constants';
import EarningsSummaryHeader from '../components/EarningsSummaryHeader';
import EarningsTabs, {
  CodePerformancePlaceholder,
  EARNINGS_TAB_LEDGER,
} from '../components/EarningsTabs';
import EarningsLedgerList from '../components/EarningsLedgerList';
import useEarningsSummary from '../hooks/useEarningsSummary';
import useEarningsLedger from '../hooks/useEarningsLedger';
import { deriveClaimability } from '../utils/deriveClaimability';

export interface RewardsMoneyEarningsViewProps {
  /**
   * The origin-type scope. `[CASHBACK, REFERRAL_REV_SHARE]` for a referrer,
   * `[CASHBACK]` for a referee — this prop is the whole difference between the
   * two variants' earnings half. Falls back to the referrer scope when the
   * screen is reached as a route without params.
   */
  originTypes?: EarningOriginType[];
  /** Rendered without its own header when embedded in the merged referee screen. */
  embedded?: boolean;
}

type EarningsRoute = RouteProp<
  { params: { originTypes?: EarningOriginType[] } },
  'params'
>;

/**
 * Summary, tabs, ledger and the claim CTA for one origin-type scope.
 *
 * The same scope goes to the summary, the ledger and the claim, so the headline
 * and the CTA amount are the same number rather than two calculations that can
 * drift.
 */
const RewardsMoneyEarningsView: React.FC<RewardsMoneyEarningsViewProps> = ({
  originTypes: originTypesProp,
  embedded = false,
}) => {
  const tw = useTailwind();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<EarningsRoute>();
  const [activeTab, setActiveTab] = useState(EARNINGS_TAB_LEDGER);

  const originTypes = useMemo(
    () =>
      originTypesProp ??
      route.params?.originTypes ??
      REFERRAL_PROGRAM_EARN_ORIGIN_TYPES.REFERRER,
    [originTypesProp, route.params?.originTypes],
  );

  const showCodePerformance = originTypes.includes('REFERRAL_REV_SHARE');

  const {
    summary,
    isLoading: isSummaryLoading,
    refresh: refreshSummary,
  } = useEarningsSummary(originTypes);

  const {
    entries,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refresh: refreshLedger,
    retry,
    isRefreshing,
  } = useEarningsLedger(originTypes);

  const claimability = useMemo(
    () => deriveClaimability(summary, originTypes),
    [summary, originTypes],
  );

  const handleRefresh = useCallback(() => {
    refreshSummary();
    refreshLedger();
  }, [refreshSummary, refreshLedger]);

  // Only the scope is passed. The sheet re-reads the summary itself so it can
  // never render a payload frozen at navigation time.
  const handleClaim = useCallback(() => {
    navigation.navigate(Routes.MODAL.REWARDS_MONEY_CLAIM_SHEET, {
      originTypes,
    });
  }, [navigation, originTypes]);

  const listHeader = useMemo(
    () => (
      <Box twClassName="px-4 pt-4 gap-4">
        <EarningsSummaryHeader summary={summary} isLoading={isSummaryLoading} />
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={handleClaim}
          isDisabled={!claimability.canClaim}
          twClassName="w-full"
          testID={REWARDS_MONEY_TEST_IDS.CLAIM_CTA}
        >
          {strings('rewards_money.earnings.claim')}
        </Button>
        <EarningsTabs
          activeIndex={activeTab}
          onTabPress={setActiveTab}
          showCodePerformance={showCodePerformance}
        />
      </Box>
    ),
    [
      summary,
      isSummaryLoading,
      handleClaim,
      claimability.canClaim,
      activeTab,
      showCodePerformance,
    ],
  );

  const content =
    activeTab === EARNINGS_TAB_LEDGER ? (
      <EarningsLedgerList
        entries={entries}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        isRefreshing={isRefreshing}
        hasMore={hasMore}
        error={error}
        loadMore={loadMore}
        refresh={handleRefresh}
        retry={retry}
        ListHeaderComponent={listHeader}
      />
    ) : (
      <Box twClassName="flex-1">
        {listHeader}
        <CodePerformancePlaceholder />
      </Box>
    );

  if (embedded) {
    return (
      <Box twClassName="flex-1" testID={REWARDS_MONEY_TEST_IDS.EARNINGS_VIEW}>
        {content}
      </Box>
    );
  }

  return (
    <ErrorBoundary navigation={navigation} view="RewardsMoneyEarningsView">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={REWARDS_MONEY_TEST_IDS.EARNINGS_VIEW}
      >
        <HeaderStandard
          title={strings('rewards_money.earnings.title')}
          titleProps={{ variant: TextVariant.HeadingSm }}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'rewards-money-earnings-back-button' }}
          includesTopInset
        />
        {content}
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default RewardsMoneyEarningsView;

import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import TabsBar from '../../../../../component-library/components-temp/Tabs/TabsBar';
import type { TabItem } from '../../../../../component-library/components-temp/Tabs/TabsBar/TabsBar.types';
import { useMoneyAccountWithdrawal } from '../../hooks/useMoneyAccount';
import { useMoneyDepositNavigation } from '../../hooks/useMoneyDepositNavigation';
import { useMoneyHistoricalEarnings } from '../../hooks/useMoneyHistoricalEarnings';
import type { MoneyNavigationParamList } from '../../types/navigation';
import EarningsChart from './EarningsChart';
import EarningsSummary from './EarningsSummary';
import {
  getDailyEarningsPoints,
  getRangeEntries,
  sumEarnings,
  type EarningsRange,
} from './earningsHistory';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';

type MoneyEarningsRoute = RouteProp<MoneyNavigationParamList, 'MoneyEarnings'>;

const handleTabPress = (): undefined => undefined;

const MoneyEarningsView = (): React.ReactElement => {
  const tw = useTailwind();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<AppNavigationProp>();
  const { params } = useRoute<MoneyEarningsRoute>();
  const {
    data,
    isLoading,
    isError,
    refetch: refetchHistoricalEarnings,
  } = useMoneyHistoricalEarnings();
  const { initiateWithdrawal } = useMoneyAccountWithdrawal();
  const { navigateToMoneyDeposit } = useMoneyDepositNavigation();
  const [selectedRange, setSelectedRange] = useState<EarningsRange>('30D');

  const requestedTab = params?.activeTab ?? 'earnings';
  const activeTab = requestedTab === 'earnings' ? requestedTab : 'earnings';
  const entries = data?.history;

  const tabs = useMemo<TabItem[]>(
    () => [
      {
        key: 'earnings',
        label: strings('money.earnings.tab_earnings'),
        content: null,
        testID: MoneyEarningsViewTestIds.TAB_EARNINGS,
      },
      {
        key: 'apy',
        label: strings('money.earnings.tab_apy'),
        content: null,
        isDisabled: true,
        testID: MoneyEarningsViewTestIds.TAB_APY,
      },
      {
        key: 'allocation',
        label: strings('money.earnings.tab_allocation'),
        content: null,
        isDisabled: true,
        testID: MoneyEarningsViewTestIds.TAB_ALLOCATION,
      },
    ],
    [],
  );

  const rangeEntries = useMemo(
    () => getRangeEntries(entries ?? [], selectedRange),
    [entries, selectedRange],
  );
  const chartPoints = useMemo(
    () => getDailyEarningsPoints(rangeEntries),
    [rangeEntries],
  );
  const thirtyDayTotal = useMemo(
    () => sumEarnings(getRangeEntries(entries ?? [], '30D')),
    [entries],
  );
  const oneYearTotal = useMemo(
    () => sumEarnings(getRangeEntries(entries ?? [], '1Y')),
    [entries],
  );
  const projectedOneYear = useMemo(
    () => Math.max(0, thirtyDayTotal) * 12,
    [thirtyDayTotal],
  );
  const latestTimestamp = useMemo(
    () => chartPoints.at(-1)?.timestamp,
    [chartPoints],
  );

  const handleRetry = useCallback(() => {
    void refetchHistoricalEarnings();
  }, [refetchHistoricalEarnings]);
  const handleWithdraw = useCallback(() => {
    void initiateWithdrawal();
  }, [initiateWithdrawal]);
  const handleAdd = useCallback(() => {
    void navigateToMoneyDeposit();
  }, [navigateToMoneyDeposit]);

  return (
    <Box
      testID={MoneyEarningsViewTestIds.CONTAINER}
      twClassName="flex-1 bg-default"
      style={{ paddingTop: insets.top }}
    >
      <HeaderStandard
        title={strings('money.earnings.title')}
        onBack={navigation.goBack}
        backButtonProps={{ testID: MoneyEarningsViewTestIds.BACK_BUTTON }}
      />
      <TabsBar
        tabs={tabs}
        activeIndex={tabs.findIndex(({ key }) => key === activeTab)}
        onTabPress={handleTabPress}
      />
      {activeTab === 'earnings' ? (
        <ScrollView
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('gap-6 px-4 py-6')}
          showsVerticalScrollIndicator={false}
        >
          <EarningsChart
            entries={entries}
            isLoading={isLoading}
            isError={isError}
            onRetry={handleRetry}
            selectedRange={selectedRange}
            onRangeChange={setSelectedRange}
          />
          <EarningsSummary
            thisMonth={thirtyDayTotal}
            lifetime={oneYearTotal}
            projectedOneYear={projectedOneYear}
            dataThrough={latestTimestamp}
          />
        </ScrollView>
      ) : null}
      <Box
        flexDirection={BoxFlexDirection.Row}
        twClassName="gap-3 px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          twClassName="flex-1"
          onPress={handleWithdraw}
          testID={MoneyEarningsViewTestIds.WITHDRAW_BUTTON}
        >
          {strings('money.earnings.withdraw')}
        </Button>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          twClassName="flex-1"
          onPress={handleAdd}
          testID={MoneyEarningsViewTestIds.ADD_BUTTON}
        >
          {strings('money.earnings.add')}
        </Button>
      </Box>
    </Box>
  );
};

export default MoneyEarningsView;

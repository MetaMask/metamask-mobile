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
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Tab from '../../../../../component-library/components-temp/Tabs/Tab';
import { useMoneyAccountWithdrawal } from '../../hooks/useMoneyAccount';
import { useMoneyDepositNavigation } from '../../hooks/useMoneyDepositNavigation';
import { useMoneyHistoricalEarnings } from '../../hooks/useMoneyHistoricalEarnings';
import type { MoneyNavigationParamList } from '../../types/navigation';
import EarningsChart from './EarningsChart';
import EarningsSummary from './EarningsSummary';
import {
  getDailyEarningsPoints,
  getRangeEntries,
  hasInvalidHistoryEntries,
  sumEarnings,
  type EarningsRange,
} from './earningsHistory';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';

type MoneyEarningsRoute = RouteProp<MoneyNavigationParamList, 'MoneyEarnings'>;

const handleTabPress = (): undefined => undefined;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

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
  const hasMalformedHistory =
    data !== undefined &&
    (!isRecord(data) || hasInvalidHistoryEntries(data.history));
  const entries =
    !hasMalformedHistory && isRecord(data) && Array.isArray(data.history)
      ? data.history
      : undefined;
  const tabs = [
    {
      key: 'earnings',
      label: strings('money.earnings.tab_earnings'),
      testID: MoneyEarningsViewTestIds.TAB_EARNINGS,
    },
    {
      key: 'apy',
      label: strings('money.earnings.tab_apy'),
      isDisabled: true,
      testID: MoneyEarningsViewTestIds.TAB_APY,
    },
    {
      key: 'allocation',
      label: strings('money.earnings.tab_allocation'),
      isDisabled: true,
      testID: MoneyEarningsViewTestIds.TAB_ALLOCATION,
    },
  ];

  const rangeEntries = useMemo(
    () => getRangeEntries(entries ?? [], selectedRange),
    [entries, selectedRange],
  );
  const chartPoints = useMemo(
    () => getDailyEarningsPoints(rangeEntries, selectedRange),
    [rangeEntries, selectedRange],
  );
  const hasHistoricalEarnings =
    !isLoading && !isError && !hasMalformedHistory && chartPoints.length > 0;
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
      <Box twClassName="px-4">
        <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-6">
          {tabs.map(({ key, label, isDisabled = false, testID }) => {
            const isActive = key === activeTab;

            return (
              <Box key={key}>
                <Tab
                  label={label}
                  isActive={isActive}
                  isDisabled={isDisabled}
                  onPress={handleTabPress}
                  testID={testID}
                  accessibilityLabel={label}
                  accessibilityRole="tab"
                  accessibilityState={{
                    selected: isActive,
                    disabled: isDisabled,
                  }}
                />
                {isActive ? <Box twClassName="h-0.5 bg-icon-default" /> : null}
              </Box>
            );
          })}
        </Box>
      </Box>
      {activeTab === 'earnings' ? (
        <ScrollView
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('gap-6 px-4 py-6')}
          showsVerticalScrollIndicator={false}
        >
          <EarningsChart
            entries={entries}
            isLoading={isLoading}
            isError={isError || hasMalformedHistory}
            onRetry={handleRetry}
            selectedRange={selectedRange}
            onRangeChange={setSelectedRange}
          />
          {hasHistoricalEarnings ? (
            <EarningsSummary
              thisMonth={thirtyDayTotal}
              lifetime={oneYearTotal}
              projectedOneYear={projectedOneYear}
              dataThrough={latestTimestamp}
            />
          ) : null}
        </ScrollView>
      ) : null}
      <Box
        twClassName="gap-3 px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
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
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          twClassName="text-center"
        >
          {strings('money.earnings.no_lockups')}
        </Text>
      </Box>
    </Box>
  );
};

export default MoneyEarningsView;

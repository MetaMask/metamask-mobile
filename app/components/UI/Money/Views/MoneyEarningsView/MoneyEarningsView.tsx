import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Tab from '../../../../../component-library/components-temp/Tabs/Tab';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectMoneyBrandRefreshEnabled } from '../../../../../selectors/featureFlagController/moneyBrandRefresh';
import { useMoneyAccountWithdrawal } from '../../hooks/useMoneyAccount';
import { useMoneyDepositNavigation } from '../../hooks/useMoneyDepositNavigation';
import {
  useMoneyHistoricalEarnings,
  type InterestHistoryResponse,
} from '../../hooks/useMoneyHistoricalEarnings';
import type { MoneyNavigationParamList } from '../../types/navigation';
import EarningsChart from './EarningsChart';
import EarningsHero from './EarningsHero';
import EarningsSummary from './EarningsSummary';
import useMoneyAccountProjectedEarnings from '../../hooks/useMoneyAccountProjectedEarnings';
import {
  getAuthoritativeRangeTotal,
  getBucketPoints,
  getSelectedRange,
  hasInvalidHistoryEntries,
  isAvailableBucket,
  type EarningsRange,
} from './earningsHistory';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';

type MoneyEarningsRoute = RouteProp<MoneyNavigationParamList, 'MoneyEarnings'>;

// TODO: Implement tab navigation when building APY and Allocation tabs.
const handleTabPress = (): undefined => undefined;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const MoneyEarningsView = (): React.ReactElement => {
  const tw = useTailwind();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<AppNavigationProp>();
  const isGlassHeader = useSelector(selectMoneyBrandRefreshEnabled) === true;
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
  const scrollViewRef = useRef<ScrollView>(null);
  const setScrollEnabled = useCallback((enabled: boolean): void => {
    scrollViewRef.current?.setNativeProps({ scrollEnabled: enabled });
  }, []);
  const requestedTab = params?.activeTab ?? 'earnings';
  const activeTab = requestedTab === 'earnings' ? requestedTab : 'earnings';
  const hasMalformedHistory =
    data !== undefined && (!isRecord(data) || hasInvalidHistoryEntries(data));
  const entries: InterestHistoryResponse | undefined =
    !hasMalformedHistory && isRecord(data)
      ? (data as InterestHistoryResponse)
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

  const selectedRangeData = useMemo(
    () => getSelectedRange(entries, selectedRange),
    [entries, selectedRange],
  );

  const chartPoints = useMemo(
    () => getBucketPoints(selectedRangeData),
    [selectedRangeData],
  );
  const thirtyDayTotal = useMemo(
    () =>
      getAuthoritativeRangeTotal(getSelectedRange(entries, '30D')) ??
      Number.NaN,
    [entries],
  );
  const oneYearTotal = useMemo(
    () =>
      getAuthoritativeRangeTotal(getSelectedRange(entries, '1Y')) ?? Number.NaN,
    [entries],
  );
  const selectedRangeTotal = useMemo(
    () => getAuthoritativeRangeTotal(selectedRangeData) ?? Number.NaN,
    [selectedRangeData],
  );
  const { projectedAmount: projectedOneYear } =
    useMoneyAccountProjectedEarnings();
  const hasUnavailableRange =
    selectedRangeData !== undefined &&
    (selectedRangeData.availability.earnings !== 'available' ||
      selectedRangeData.availability.usd_pricing !== 'available');
  const hasHistoricalEarnings =
    !isLoading &&
    !isError &&
    !hasMalformedHistory &&
    Number.isFinite(thirtyDayTotal) &&
    Number.isFinite(oneYearTotal) &&
    Number.isFinite(selectedRangeTotal) &&
    chartPoints.some(isAvailableBucket);

  const handleRetry = useCallback(() => {
    refetchHistoricalEarnings();
  }, [refetchHistoricalEarnings]);
  const handleWithdraw = useCallback(() => {
    initiateWithdrawal();
  }, [initiateWithdrawal]);
  const handleAdd = useCallback(() => {
    navigateToMoneyDeposit();
  }, [navigateToMoneyDeposit]);

  return (
    <Box
      testID={MoneyEarningsViewTestIds.CONTAINER}
      twClassName="flex-1 bg-default"
    >
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        includesTopInset
        title={strings('money.earnings.title')}
        onBack={navigation.goBack}
        backButtonProps={{ testID: MoneyEarningsViewTestIds.BACK_BUTTON }}
      />
      <Box twClassName="px-4 py-4">
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
          ref={scrollViewRef}
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('gap-6 px-4 py-6')}
          showsVerticalScrollIndicator={false}
        >
          {hasHistoricalEarnings && selectedRangeData ? (
            <EarningsHero
              totalEarned={oneYearTotal}
              periodEarnings={selectedRangeTotal}
              periodStart={selectedRangeData.range_start}
              periodEnd={selectedRangeData.range_end}
              periodGranularity={selectedRangeData.granularity}
            />
          ) : null}
          <EarningsChart
            entries={entries}
            isLoading={isLoading}
            isError={isError || hasMalformedHistory || hasUnavailableRange}
            onRetry={handleRetry}
            selectedRange={selectedRange}
            onRangeChange={setSelectedRange}
            setScrollEnabled={setScrollEnabled}
          />
          {hasHistoricalEarnings ? (
            <Box twClassName="py-4">
              <EarningsSummary
                thisMonth={thirtyDayTotal}
                lifetime={oneYearTotal}
                projectedOneYear={projectedOneYear}
              />
            </Box>
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
      </Box>
    </Box>
  );
};

export default MoneyEarningsView;

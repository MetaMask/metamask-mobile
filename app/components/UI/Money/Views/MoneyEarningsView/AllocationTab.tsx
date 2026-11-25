import React, { useCallback, useRef } from 'react';
import { ScrollView } from 'react-native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyVaultComposition } from '../../hooks/useMoneyVaultComposition';
import MoneyVaultCompositionChart from './components/MoneyVaultCompositionChart';
import MoneyVaultCompositionMarketsTable from './components/MoneyVaultCompositionMarketsTable';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';
import { CHART_VIEWBOX_SIZE } from './components/MoneyVaultCompositionChart/MoneyVaultCompositionChart.utils';

export const setAllocationScrollEnabled = (
  scrollView: Pick<ScrollView, 'setNativeProps'> | null,
  enabled: boolean,
): void => {
  scrollView?.setNativeProps({ scrollEnabled: enabled });
};

const AllocationTab = (): React.ReactElement => {
  const tw = useTailwind();

  const {
    data,
    isLoading: isCompositionLoading,
    isError,
    refetch,
  } = useMoneyVaultComposition();

  const scrollViewRef = useRef<ScrollView>(null);

  const setScrollEnabled = useCallback((enabled: boolean): void => {
    setAllocationScrollEnabled(scrollViewRef.current, enabled);
  }, []);

  const handleRetry = useCallback(async (): Promise<void> => {
    await refetch();
  }, [refetch]);

  const renderContent = (): React.ReactElement => {
    if (isCompositionLoading) {
      return (
        <Skeleton
          height={CHART_VIEWBOX_SIZE}
          width={CHART_VIEWBOX_SIZE}
          testID={MoneyEarningsViewTestIds.ALLOCATION_LOADING}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={strings('money.earnings.allocation_loading')}
        />
      );
    }

    if (isError) {
      return (
        <Box
          testID={MoneyEarningsViewTestIds.ALLOCATION_ERROR}
          accessibilityRole="alert"
          twClassName="items-center justify-center gap-3 px-4 py-8"
        >
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings('money.earnings.allocation_error')}
          </Text>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            onPress={handleRetry}
          >
            {strings('money.earnings.allocation_retry')}
          </Button>
        </Box>
      );
    }

    if (!data) {
      return (
        <Box
          testID={MoneyEarningsViewTestIds.ALLOCATION_ERROR}
          accessibilityRole="alert"
          twClassName="items-center justify-center gap-3 px-4 py-8"
        >
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings('money.earnings.allocation_error')}
          </Text>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            onPress={handleRetry}
          >
            {strings('money.earnings.allocation_retry')}
          </Button>
        </Box>
      );
    }

    if (data.components.length === 0) {
      return (
        <Box
          testID={MoneyEarningsViewTestIds.ALLOCATION_EMPTY}
          twClassName="items-center justify-center px-4 py-8"
        >
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings('money.earnings.allocation_empty')}
          </Text>
        </Box>
      );
    }

    return (
      <Box twClassName="items-center w-full gap-6">
        {data.data_freshness === 'degraded' ? (
          <Text
            testID={MoneyEarningsViewTestIds.ALLOCATION_DEGRADED}
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings('money.earnings.allocation_degraded')}
          </Text>
        ) : null}
        <MoneyVaultCompositionChart
          components={data.components}
          setScrollEnabled={setScrollEnabled}
        />
        <Box twClassName="w-full gap-2">
          <Text variant={TextVariant.HeadingMd} twClassName="self-start">
            {strings('money.earnings.markets')}
          </Text>
          <MoneyVaultCompositionMarketsTable
            components={data.components}
            marketLabel={strings('money.earnings.market')}
            allocationLabel={strings('money.earnings.allocation')}
            supplyApyLabel={strings('money.earnings.supply_apy')}
            incentiveAprLabel={strings('money.earnings.incentive_apr')}
            networkLabel={strings('money.earnings.monad')}
          />
        </Box>
      </Box>
    );
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      contentContainerStyle={tw.style('items-center justify-center px-4 py-6')}
      showsVerticalScrollIndicator={false}
    >
      {renderContent()}
    </ScrollView>
  );
};

export default AllocationTab;

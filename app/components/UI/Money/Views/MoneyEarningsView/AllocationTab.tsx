import React, { useCallback, useRef } from 'react';
import { ScrollView } from 'react-native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
  SectionDivider,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyVaultComposition } from '../../hooks/useMoneyVaultComposition';
import AllocationDetails from './components/AllocationDetails';
import MoneyVaultCompositionChart from './components/MoneyVaultCompositionChart';
import MoneyVaultCompositionMarketsTable from './components/MoneyVaultCompositionMarketsTable';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';

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

  const handleRetry = useCallback((): void => {
    void refetch();
  }, [refetch]);

  const renderContent = (): React.ReactElement => {
    if (isError || (!data && !isCompositionLoading)) {
      return (
        <Box
          testID={MoneyEarningsViewTestIds.ALLOCATION_ERROR}
          accessibilityRole="alert"
          className="w-full flex-1 items-center justify-center gap-3 px-4 py-8"
        >
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            className="text-center"
          >
            {strings('money.earnings.allocation_error')}
          </Text>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            onPress={handleRetry}
            className="justify-center self-center"
          >
            {strings('money.earnings.allocation_retry')}
          </Button>
        </Box>
      );
    }

    if (!isCompositionLoading && data?.components.length === 0) {
      return (
        <Box
          testID={MoneyEarningsViewTestIds.ALLOCATION_EMPTY}
          className="items-center justify-center px-4 py-8"
        >
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            className="text-center"
          >
            {strings('money.earnings.allocation_empty')}
          </Text>
        </Box>
      );
    }

    return (
      <Box className="w-full gap-6">
        {data?.data_freshness === 'degraded' ? (
          <Text
            testID={MoneyEarningsViewTestIds.ALLOCATION_DEGRADED}
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            className="text-center"
          >
            {strings('money.earnings.allocation_degraded')}
          </Text>
        ) : null}
        <Box className="items-center">
          <MoneyVaultCompositionChart
            components={data?.components ?? []}
            isLoading={isCompositionLoading}
            setScrollEnabled={setScrollEnabled}
          />
        </Box>
        <Box className="w-full gap-2">
          <MoneyVaultCompositionMarketsTable
            components={data?.components ?? []}
            isLoading={isCompositionLoading}
            marketLabel={strings('money.earnings.markets')}
            allocationLabel={strings('money.earnings.allocation')}
            apyLabel={strings('money.earnings.apy')}
            networkLabel={strings('money.earnings.monad')}
          />
        </Box>
        <SectionDivider
          testID={MoneyEarningsViewTestIds.ALLOCATION_DETAILS_DIVIDER}
          accessible={false}
          className="m-0 -mx-4"
        />
        <Box className="w-full">
          <AllocationDetails />
        </Box>
        <SectionDivider
          testID={MoneyEarningsViewTestIds.ALLOCATION_RISKS_DIVIDER}
          accessible={false}
          className="m-0 -mx-4"
        />
        <Box className="w-full gap-2">
          <Text
            variant={TextVariant.HeadingSm}
            color={TextColor.TextAlternative}
          >
            {strings('money.earnings.risks_and_disclosures.title')}
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('money.earnings.risks_and_disclosures.description')}
          </Text>
        </Box>
      </Box>
    );
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      style={tw.style('flex-1')}
      contentContainerStyle={tw.style('items-center justify-center px-4 py-6')}
      showsVerticalScrollIndicator={false}
    >
      {renderContent()}
    </ScrollView>
  );
};

export default AllocationTab;

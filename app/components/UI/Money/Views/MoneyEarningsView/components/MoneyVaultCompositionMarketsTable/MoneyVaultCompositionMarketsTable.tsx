import React from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { getVaultCompositionComponentsInChartOrder } from '../MoneyVaultCompositionChart/MoneyVaultCompositionChart.utils';
import MoneyVaultCompositionMarketRow from '../MoneyVaultCompositionMarketRow';
import type { MoneyVaultCompositionMarketsTableProps } from './MoneyVaultCompositionMarketsTable.types';
import { MoneyVaultCompositionMarketsTableTestIds } from './MoneyVaultCompositionMarketsTable.testIds';

/**
 * Renders the positive vault components in the same order as the composition chart.
 *
 * @param props - Component data and localized table labels.
 * @returns A vault composition markets table.
 */
const MoneyVaultCompositionMarketsTable = ({
  allocationLabel,
  components,
  incentiveAprLabel,
  marketLabel,
  networkLabel,
  supplyApyLabel,
}: MoneyVaultCompositionMarketsTableProps): React.ReactElement => {
  const tw = useTailwind();
  const orderedComponents =
    getVaultCompositionComponentsInChartOrder(components);

  return (
    <Box
      testID={MoneyVaultCompositionMarketsTableTestIds.TABLE}
      accessible={false}
      style={tw.style('w-full')}
    >
      <Box
        testID={MoneyVaultCompositionMarketsTableTestIds.HEADER}
        accessible={false}
        twClassName="flex-row items-center gap-3 pb-2"
      >
        <Text
          testID={MoneyVaultCompositionMarketsTableTestIds.MARKET_HEADER}
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          twClassName="min-w-0 flex-1 pl-4"
        >
          {marketLabel}
        </Text>
        <Text
          testID={MoneyVaultCompositionMarketsTableTestIds.ALLOCATION_HEADER}
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          numberOfLines={1}
          adjustsFontSizeToFit
          twClassName="w-16 text-right"
        >
          {allocationLabel}
        </Text>
        <Text
          testID={MoneyVaultCompositionMarketsTableTestIds.SUPPLY_APY_HEADER}
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          twClassName="w-16 text-right"
        >
          {supplyApyLabel}
        </Text>
        <Text
          testID={MoneyVaultCompositionMarketsTableTestIds.INCENTIVE_APR_HEADER}
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          twClassName="w-16 text-right"
        >
          {incentiveAprLabel}
        </Text>
      </Box>
      {orderedComponents.map((component) => (
        <MoneyVaultCompositionMarketRow
          key={component.component_key}
          component={component}
          networkLabel={networkLabel}
        />
      ))}
    </Box>
  );
};

export default MoneyVaultCompositionMarketsTable;

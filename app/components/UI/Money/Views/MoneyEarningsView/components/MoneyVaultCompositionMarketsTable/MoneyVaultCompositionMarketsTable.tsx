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

const LOADING_ROW_KEYS = ['loading-1', 'loading-2', 'loading-3'];

/**
 * Renders the positive vault components in the same order as the composition chart.
 *
 * @param props - Component data and localized table labels.
 * @returns A vault composition markets table.
 */
const MoneyVaultCompositionMarketsTable = ({
  allocationLabel,
  apyLabel,
  components,
  isLoading = false,
  marketLabel,
  networkLabel,
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
        className="flex-row items-center gap-3 pb-2"
      >
        <Text
          testID={MoneyVaultCompositionMarketsTableTestIds.MARKET_HEADER}
          variant={TextVariant.HeadingMd}
          color={TextColor.TextDefault}
          className="min-w-0 flex-1"
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
          className="w-16 text-right"
        >
          {allocationLabel}
        </Text>
        <Text
          testID={MoneyVaultCompositionMarketsTableTestIds.APY_HEADER}
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          className="w-16 text-right"
        >
          {apyLabel}
        </Text>
      </Box>
      {isLoading
        ? LOADING_ROW_KEYS.map((key) => (
            <MoneyVaultCompositionMarketRow
              key={key}
              isLoading
              networkLabel={networkLabel}
            />
          ))
        : orderedComponents.map((component) => (
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

import React from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  formatVaultCompositionProtocolName,
  getVaultCompositionPrimaryAssetSymbol,
} from '../../../../utils/moneyVaultComposition';
import { useTheme } from '../../../../../../../util/theme';
import {
  formatAllocationPercentage,
  getVaultCompositionComponentColor,
} from '../MoneyVaultCompositionChart/MoneyVaultCompositionChart.utils';
import type { MoneyVaultCompositionMarketRowProps } from './MoneyVaultCompositionMarketRow.types';
import { MoneyVaultCompositionMarketRowTestIds } from './MoneyVaultCompositionMarketRow.testIds';

/**
 * Renders one vault component in the markets table.
 *
 * @param props - Component data and display context.
 * @returns A vault composition market row.
 */
const MoneyVaultCompositionMarketRow = ({
  component,
  networkLabel,
}: MoneyVaultCompositionMarketRowProps): React.ReactElement => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const componentKey = component.component_key;
  const protocolLabel = formatVaultCompositionProtocolName(component.protocol);
  const secondaryLabel =
    component.protocol === 'liquidity_buffer'
      ? protocolLabel
      : `${protocolLabel} · ${networkLabel}`;

  return (
    <Box
      testID={MoneyVaultCompositionMarketRowTestIds.ROW(componentKey)}
      accessible={false}
      twClassName="flex-row items-center gap-3 py-3"
    >
      <Box
        testID={MoneyVaultCompositionMarketRowTestIds.DOT(componentKey)}
        accessible={false}
        style={[
          tw.style('h-2 w-2 shrink-0 rounded-full'),
          {
            backgroundColor: getVaultCompositionComponentColor(
              componentKey,
              colors,
            ),
          },
        ]}
      />
      <Box accessible={false} twClassName="min-w-0 flex-1">
        <Text
          testID={MoneyVaultCompositionMarketRowTestIds.PRIMARY_LABEL(
            componentKey,
          )}
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
        >
          {getVaultCompositionPrimaryAssetSymbol(component)}
        </Text>
        <Text
          testID={MoneyVaultCompositionMarketRowTestIds.SECONDARY_LABEL(
            componentKey,
          )}
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
        >
          {secondaryLabel}
        </Text>
      </Box>
      <Text
        testID={MoneyVaultCompositionMarketRowTestIds.ALLOCATION(componentKey)}
        variant={TextVariant.BodyMd}
        twClassName="w-20 text-right"
      >
        {formatAllocationPercentage(component.allocation_fraction)}
      </Text>
      <Text
        testID={MoneyVaultCompositionMarketRowTestIds.APY(componentKey)}
        variant={TextVariant.BodyMd}
        twClassName="w-20 text-right"
      >
        {formatAllocationPercentage(component.organic_supply_apy)}
      </Text>
    </Box>
  );
};

export default MoneyVaultCompositionMarketRow;

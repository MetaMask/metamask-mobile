import React from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../../locales/i18n';
import {
  formatVaultCompositionProtocolName,
  getVaultCompositionPrimaryAssetSymbol,
} from '../../../../utils/moneyVaultComposition';
import { formatPercentage } from '../../../../utils/formatPercentage';
import { useTheme } from '../../../../../../../util/theme';
import { getVaultCompositionComponentColor } from '../MoneyVaultCompositionChart/MoneyVaultCompositionChart.utils';
import type { MoneyVaultCompositionMarketRowProps } from './MoneyVaultCompositionMarketRow.types';
import { MoneyVaultCompositionMarketRowTestIds } from './MoneyVaultCompositionMarketRow.testIds';

const formatMarketAssetSymbol = (assetSymbol: string): string =>
  assetSymbol === 'mUSD' ? 'MetaMask USD' : assetSymbol;

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
  const primaryLabel =
    component.protocol === 'liquidity_buffer'
      ? protocolLabel
      : `${protocolLabel} • ${networkLabel}`;
  const secondaryLabel = formatMarketAssetSymbol(
    getVaultCompositionPrimaryAssetSymbol(component),
  );

  return (
    <Box
      testID={MoneyVaultCompositionMarketRowTestIds.ROW(componentKey)}
      accessible={false}
      twClassName="flex-row items-center gap-3 py-3"
    >
      <Box
        testID={MoneyVaultCompositionMarketRowTestIds.INDICATOR(componentKey)}
        accessible={false}
        style={[
          tw.style('h-10 w-2 shrink-0'),
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
          {primaryLabel}
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
        twClassName="w-16 text-right"
      >
        {formatPercentage(component.allocation_fraction)}
      </Text>
      <Text
        testID={MoneyVaultCompositionMarketRowTestIds.APY(componentKey)}
        variant={TextVariant.BodyMd}
        color={
          component.estimated_total_annual_rate !== null &&
          component.estimated_total_annual_rate !== '0'
            ? TextColor.SuccessDefault
            : TextColor.TextDefault
        }
        twClassName="w-16 text-right"
      >
        {component.estimated_total_annual_rate === null
          ? strings('money.earnings.unavailable')
          : component.estimated_total_annual_rate === '0'
            ? '—'
            : formatPercentage(component.estimated_total_annual_rate)}
      </Text>
    </Box>
  );
};

export default MoneyVaultCompositionMarketRow;

import React from 'react';
import {
  Box,
  FontWeight,
  Skeleton,
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
import { parseApy } from '../../../../utils/apy';
import { formatPercentage } from '../../../../utils/formatPercentage';
import { useTheme } from '../../../../../../../util/theme';
import { getVaultCompositionComponentColor } from '../MoneyVaultCompositionChart/MoneyVaultCompositionChart.utils';
import type { MoneyVaultCompositionMarketRowProps } from './MoneyVaultCompositionMarketRow.types';
import { MoneyVaultCompositionMarketRowTestIds } from './MoneyVaultCompositionMarketRow.testIds';

const formatMarketAssetSymbol = (assetSymbol: string): string =>
  assetSymbol === 'mUSD' ? 'MetaMask USD' : assetSymbol;

const getApyDisplayValue = (
  estimatedApy: string | null,
  isZeroEstimatedApy: boolean,
): string => {
  if (estimatedApy === null) {
    return strings('money.earnings.unavailable');
  }

  if (isZeroEstimatedApy) {
    return '—';
  }

  return formatPercentage(estimatedApy);
};

/**
 * Renders one vault component in the markets table.
 *
 * @param props - Component data and display context.
 * @returns A vault composition market row.
 */
const MoneyVaultCompositionMarketRow = ({
  component,
  isLoading = false,
  networkLabel,
}: MoneyVaultCompositionMarketRowProps): React.ReactElement => {
  const tw = useTailwind();
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <Box
        testID={MoneyVaultCompositionMarketRowTestIds.LOADING}
        accessible={false}
        className="flex-row items-center gap-3 py-3"
      >
        <Skeleton width={8} height={40} accessible={false} />
        <Box accessible={false} className="min-w-0 flex-1 gap-1">
          <Skeleton
            width="85%"
            height={18}
            accessible={false}
            twClassName="rounded-md"
          />
          <Skeleton
            width="55%"
            height={16}
            accessible={false}
            twClassName="rounded-md"
          />
        </Box>
        <Skeleton
          width={64}
          height={18}
          accessible={false}
          twClassName="rounded-md"
        />
        <Skeleton
          width={64}
          height={18}
          accessible={false}
          twClassName="rounded-md"
        />
      </Box>
    );
  }

  if (!component) {
    throw new Error('Market row requires component data when not loading');
  }

  const componentKey = component.component_key;
  const isZeroEstimatedApy =
    parseApy(component.estimated_total_annual_rate) === 0;
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
      className="flex-row items-center gap-3 py-3"
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
      <Box accessible={false} className="min-w-0 flex-1">
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
        className="w-16 text-right"
      >
        {formatPercentage(component.allocation_fraction)}
      </Text>
      <Text
        testID={MoneyVaultCompositionMarketRowTestIds.APY(componentKey)}
        variant={TextVariant.BodyMd}
        color={
          component.estimated_total_annual_rate !== null && !isZeroEstimatedApy
            ? TextColor.SuccessDefault
            : TextColor.TextDefault
        }
        className="w-16 text-right"
      >
        {getApyDisplayValue(
          component.estimated_total_annual_rate,
          isZeroEstimatedApy,
        )}
      </Text>
    </Box>
  );
};

export default MoneyVaultCompositionMarketRow;

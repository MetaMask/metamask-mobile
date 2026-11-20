import React from 'react';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import {
  getVaultCompositionBarWidth,
  formatVaultCompositionProtocolName,
} from '../../../../utils/moneyVaultComposition';
import { formatAllocationPercentage } from '../MoneyVaultCompositionChart/MoneyVaultCompositionChart.utils';
import type { MoneyMarketExposureRowProps } from './MoneyMarketExposureRow.types';
import { MoneyMarketExposureRowTestIds } from './MoneyMarketExposureRow.testIds';

/**
 * Renders one protocol allocation bar.
 *
 * @param props - Protocol allocation data.
 * @returns A protocol exposure row.
 */
const MoneyMarketExposureRow = ({
  protocol,
}: MoneyMarketExposureRowProps): React.ReactElement => {
  const protocolLabel = formatVaultCompositionProtocolName(
    protocol.protocol_key,
  );
  const allocationPercentage = formatAllocationPercentage(
    protocol.allocation_fraction,
  );
  const barWidth = getVaultCompositionBarWidth(protocol.allocation_fraction);
  const rowTestId = MoneyMarketExposureRowTestIds.ROW(protocol.protocol_key);

  return (
    <Box testID={rowTestId} accessible={false} twClassName="w-full gap-2">
      <Box
        accessible={false}
        twClassName="flex-row items-center justify-between gap-3"
      >
        <Text
          testID={MoneyMarketExposureRowTestIds.LABEL(protocol.protocol_key)}
          variant={TextVariant.BodyMd}
        >
          {protocolLabel}
        </Text>
        <Text
          testID={MoneyMarketExposureRowTestIds.ALLOCATION(
            protocol.protocol_key,
          )}
          variant={TextVariant.BodyMd}
        >
          {allocationPercentage}
        </Text>
      </Box>
      <Box
        testID={MoneyMarketExposureRowTestIds.TRACK(protocol.protocol_key)}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={protocolLabel}
        accessibilityValue={{
          min: 0,
          max: 100,
          now: barWidth,
          text: allocationPercentage,
        }}
        twClassName="h-1 w-full overflow-hidden rounded-full bg-muted"
      >
        <Box
          testID={MoneyMarketExposureRowTestIds.FILL(protocol.protocol_key)}
          accessible={false}
          twClassName="h-full rounded-full bg-text-default"
          style={{ width: `${barWidth}%` }}
        />
      </Box>
    </Box>
  );
};

export default MoneyMarketExposureRow;

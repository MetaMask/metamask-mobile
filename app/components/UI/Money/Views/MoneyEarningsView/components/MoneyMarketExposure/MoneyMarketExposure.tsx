import React, { useMemo } from 'react';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../../locales/i18n';
import { getVaultCompositionProtocolsInAllocationOrder } from '../../../../utils/moneyVaultComposition';
import MoneyMarketExposureRow from '../MoneyMarketExposureRow';
import type { MoneyMarketExposureProps } from './MoneyMarketExposure.types';
import { MoneyMarketExposureTestIds } from './MoneyMarketExposure.testIds';

/**
 * Renders the protocol allocation section for a Money vault.
 *
 * @param props - Protocol allocation data.
 * @returns A protocol exposure section.
 */
const MoneyMarketExposure = ({
  protocols,
}: MoneyMarketExposureProps): React.ReactElement => {
  const tw = useTailwind();
  const orderedProtocols = useMemo(
    () => getVaultCompositionProtocolsInAllocationOrder(protocols),
    [protocols],
  );

  return (
    <Box
      testID={MoneyMarketExposureTestIds.SECTION}
      accessible={false}
      style={tw.style('w-full gap-4')}
    >
      <Text
        testID={MoneyMarketExposureTestIds.TITLE}
        variant={TextVariant.HeadingMd}
      >
        {strings('money.earnings.protocol_exposure')}
      </Text>
      {orderedProtocols.length === 0 ? (
        <Text
          testID={MoneyMarketExposureTestIds.EMPTY}
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
        >
          {strings('money.earnings.allocation_empty')}
        </Text>
      ) : (
        orderedProtocols.map((protocol) => (
          <MoneyMarketExposureRow
            key={protocol.protocol_key}
            protocol={protocol}
          />
        ))
      )}
    </Box>
  );
};

export default MoneyMarketExposure;

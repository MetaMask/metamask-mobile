import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { VipTransactionDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import PerpsTokenLogo from '../../../Perps/components/PerpsTokenLogo';
import { formatRewardsTimeOnly, formatUsd } from '../../utils/formatUtils';

export interface VipPerpsTransactionRowProps {
  transaction: VipTransactionDto;
  testID?: string;
}

const VipPerpsTransactionRow: React.FC<VipPerpsTransactionRowProps> = ({
  transaction,
  testID,
}) => {
  const coin = transaction.perps?.coin ?? '—';

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="w-full py-3"
      gap={3}
      testID={testID}
    >
      <PerpsTokenLogo
        symbol={coin}
        size={40}
        recyclingKey={`${coin}-${transaction.id}`}
      />

      <Box twClassName="flex-1" justifyContent={BoxJustifyContent.Start}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
        >
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {coin}
          </Text>
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {formatUsd(transaction.volumeUsd)}
          </Text>
        </Box>

        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.End}
        >
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {formatRewardsTimeOnly(new Date(transaction.timestamp))}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export default VipPerpsTransactionRow;

import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { VipTransactionDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { formatRewardsTimeOnly, formatUsd } from '../../utils/formatUtils';
import { strings } from '../../../../../../locales/i18n';

export interface VipSwapTransactionRowProps {
  transaction: VipTransactionDto;
  testID?: string;
}

const VipSwapTransactionRow: React.FC<VipSwapTransactionRowProps> = ({
  transaction,
  testID,
}) => {
  const srcSymbol = transaction.swap?.srcAssetSymbol ?? '—';
  const destSymbol = transaction.swap?.destAssetSymbol ?? '—';
  const detail = `${srcSymbol} → ${destSymbol}`;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="w-full py-3"
      gap={3}
      testID={testID}
    >
      <Box
        twClassName="bg-muted rounded-full items-center justify-center size-10"
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
      >
        <Icon
          name={IconName.SwapHorizontal}
          size={IconSize.Lg}
          twClassName="text-icon-default"
        />
      </Box>

      <Box twClassName="flex-1" justifyContent={BoxJustifyContent.Start}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
        >
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {strings('rewards.vip_transactions.swap_title')}
          </Text>
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {formatUsd(transaction.volumeUsd)}
          </Text>
        </Box>

        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
        >
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="max-w-[60%]"
            numberOfLines={1}
          >
            {detail}
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {formatRewardsTimeOnly(new Date(transaction.timestamp))}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export default VipSwapTransactionRow;

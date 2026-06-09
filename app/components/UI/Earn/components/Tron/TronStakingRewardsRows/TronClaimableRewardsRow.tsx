import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon as DSIcon,
  IconName as DSIconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

export const TronClaimableRewardsRowTestIds = {
  ROW: 'tron-staking-rewards-total-row',
  SUBTITLE: 'tron-staking-rewards-total-subtitle',
} as const;

export interface TronClaimableRewardsRowProps {
  title: string;
  subtitle: string;
  hideBalances: boolean;
}

const HIDDEN_SUBTITLE = '•'.repeat(9);

const TronClaimableRewardsRow = ({
  title,
  subtitle,
  hideBalances,
}: TronClaimableRewardsRowProps) => (
  <Box
    testID={TronClaimableRewardsRowTestIds.ROW}
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    paddingTop={3}
    paddingBottom={3}
  >
    <Box twClassName="h-10 w-10 rounded-full bg-muted mr-4 items-center justify-center">
      <DSIcon name={DSIconName.MoneyBag} size={IconSize.Lg} />
    </Box>
    <Box twClassName="flex-1">
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
      >
        {title}
      </Text>
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        testID={TronClaimableRewardsRowTestIds.SUBTITLE}
      >
        {hideBalances ? HIDDEN_SUBTITLE : subtitle}
      </Text>
    </Box>
  </Box>
);

export default TronClaimableRewardsRow;

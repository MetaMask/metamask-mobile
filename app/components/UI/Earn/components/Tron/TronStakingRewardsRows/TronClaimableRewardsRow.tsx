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
import {
  TextColor as CLTextColor,
  TextVariant as CLTextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../../component-library/components/Texts/SensitiveText';

export const TronClaimableRewardsRowTestIds = {
  ROW: 'tron-staking-rewards-total-row',
  SUBTITLE: 'tron-staking-rewards-total-subtitle',
} as const;

export interface TronClaimableRewardsRowProps {
  title: string;
  subtitle: string;
  hideBalances: boolean;
}

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
      <SensitiveText
        variant={CLTextVariant.BodySM}
        color={CLTextColor.Alternative}
        isHidden={hideBalances}
        length={SensitiveTextLength.Medium}
        testID={TronClaimableRewardsRowTestIds.SUBTITLE}
      >
        {subtitle}
      </SensitiveText>
    </Box>
  </Box>
);

export default TronClaimableRewardsRow;

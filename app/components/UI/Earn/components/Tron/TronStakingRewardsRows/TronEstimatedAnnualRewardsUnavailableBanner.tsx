import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon as DSIcon,
  IconName as DSIconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';

export const TronEstimatedAnnualRewardsUnavailableBannerTestIds = {
  CONTAINER: 'tron-staking-rewards-estimated-unavailable-banner',
} as const;

export interface TronEstimatedAnnualRewardsUnavailableBannerProps {
  message: string;
}

const TronEstimatedAnnualRewardsUnavailableBanner = ({
  message,
}: TronEstimatedAnnualRewardsUnavailableBannerProps) => (
  <Box
    testID={TronEstimatedAnnualRewardsUnavailableBannerTestIds.CONTAINER}
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Start}
    twClassName="mt-1 bg-error-muted rounded-lg px-3 py-2 gap-2"
  >
    <DSIcon
      name={DSIconName.Error}
      size={IconSize.Sm}
      twClassName="text-error-default mt-0.5"
    />
    <Text variant={TextVariant.BodySm} twClassName="flex-1 text-error-default">
      {message}
    </Text>
  </Box>
);

export default TronEstimatedAnnualRewardsUnavailableBanner;

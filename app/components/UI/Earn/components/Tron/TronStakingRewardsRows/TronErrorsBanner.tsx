import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon as DSIcon,
  IconName as DSIconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

export const TronErrorsBannerTestIds = {
  CONTAINER: 'tron-errors-banner',
} as const;

export interface TronErrorsBannerProps {
  messages: string[];
}

const TronErrorsBanner = ({ messages }: TronErrorsBannerProps) => (
  <Box
    testID={TronErrorsBannerTestIds.CONTAINER}
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Start}
    twClassName="mt-1 rounded-lg bg-error-muted px-3 py-2 gap-2"
  >
    <DSIcon
      name={DSIconName.Error}
      size={IconSize.Sm}
      twClassName="mt-0.5 text-error-default"
    />
    <Box twClassName="flex-1">
      {messages.map((message, index) => (
        <Box
          key={`${index}-${message}`}
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Start}
          twClassName="gap-1"
        >
          <Text variant={TextVariant.BodySm} color={TextColor.ErrorDefault}>
            {'•'}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.ErrorDefault}
            twClassName="flex-1"
          >
            {message}
          </Text>
        </Box>
      ))}
    </Box>
  </Box>
);

export default TronErrorsBanner;

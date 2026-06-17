///: BEGIN:ONLY_INCLUDE_IF(stellar)
import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';

export const StellarClassicTrustlineErrorBannerTestIds = {
  CONTAINER: 'stellar-classic-trustline-error-banner',
} as const;

export interface StellarClassicTrustlineErrorBannerProps {
  message: string | null;
  onDismiss: () => void;
  testID?: string;
}

export const StellarClassicTrustlineErrorBanner = ({
  message,
  onDismiss,
  testID = StellarClassicTrustlineErrorBannerTestIds.CONTAINER,
}: StellarClassicTrustlineErrorBannerProps) => {
  if (!message) {
    return null;
  }

  return (
    <Box
      testID={testID}
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Start}
      twClassName="mt-3 rounded-lg bg-error-muted px-3 py-2 gap-2"
    >
      <Icon
        name={IconName.Danger}
        size={IconSize.Sm}
        color={IconColor.ErrorDefault}
        twClassName="mt-0.5"
      />
      <Box twClassName="flex-1">
        <Text variant={TextVariant.BodySm} color={TextColor.ErrorDefault}>
          {message}
        </Text>
      </Box>
      <Button
        variant={ButtonVariants.Link}
        size={ButtonSize.Sm}
        width={ButtonWidthTypes.Auto}
        label="×"
        onPress={onDismiss}
      />
    </Box>
  );
};
///: END:ONLY_INCLUDE_IF

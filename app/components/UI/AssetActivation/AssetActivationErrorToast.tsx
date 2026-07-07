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

export const AssetActivationErrorToastTestIds = {
  CONTAINER: 'asset-activation-error-toast',
} as const;

export interface AssetActivationErrorToastProps {
  message: string | null;
  onClose: () => void;
  testID?: string;
}

export const AssetActivationErrorToast = ({
  message,
  onClose,
  testID = AssetActivationErrorToastTestIds.CONTAINER,
}: AssetActivationErrorToastProps) => {
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
        onPress={onClose}
      />
    </Box>
  );
};
///: END:ONLY_INCLUDE_IF

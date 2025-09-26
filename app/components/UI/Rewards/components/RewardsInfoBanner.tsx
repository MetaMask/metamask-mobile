import React from 'react';
import {
  Box,
  Text,
  Button,
  Icon,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  ButtonVariant,
  ButtonSize,
  IconName,
  IconSize,
  FontWeight,
} from '@metamask/design-system-react-native';

interface RewardsInfoBannerProps {
  title: string | React.ReactNode;
  description: string;
  onDismiss?: () => void;
  onConfirm?: () => void;
  confirmButtonLabel?: string;
  onConfirmLoading?: boolean;
  testID?: string;
  showInfoIcon?: boolean;
}

const RewardsInfoBanner: React.FC<RewardsInfoBannerProps> = ({
  title,
  description,
  onDismiss,
  onConfirm,
  confirmButtonLabel,
  onConfirmLoading,
  testID,
  showInfoIcon = true,
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Start}
    twClassName="bg-info-muted rounded-2xl p-4 gap-4 w-full"
    testID={testID}
  >
    {/* Column 1: Info Icon */}
    {showInfoIcon && (
      <Icon
        name={IconName.Info}
        size={IconSize.Xl}
        twClassName="text-info-default"
      />
    )}

    {/* Column 2: Content */}
    <Box twClassName="flex-1 gap-4">
      <Box twClassName="gap-1">
        {typeof title === 'string' ? (
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Bold}
            twClassName="text-default"
          >
            {title}
          </Text>
        ) : (
          title
        )}

        {/* Description */}
        <Text variant={TextVariant.BodyMd} twClassName="text-default">
          {description}
        </Text>
      </Box>

      {/* Button Section */}
      {(onDismiss || onConfirm) && (
        <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
          {onDismiss && (
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              onPress={onDismiss}
            >
              Dismiss
            </Button>
          )}
          {onConfirm && (
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Md}
              onPress={onConfirm}
              isLoading={onConfirmLoading}
            >
              {confirmButtonLabel || 'Confirm'}
            </Button>
          )}
        </Box>
      )}
    </Box>
  </Box>
);

export default RewardsInfoBanner;

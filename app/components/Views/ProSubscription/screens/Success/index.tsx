import React from 'react';
import {
  Box,
  Text,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

interface SuccessProps {
  onClose: () => void;
}

/**
 * SUB-994: Post-purchase success screen.
 * Placeholder — replaces Benefits once the user completes checkout.
 */
const Success = ({ onClose }: SuccessProps) => (
  <Box twClassName="flex-1 bg-background-default items-center justify-center px-6">
    <Text variant={TextVariant.HeadingLg} twClassName="mb-4 text-center">
      {strings('pro_subscription.success.title')}
    </Text>

    <Button
      variant={ButtonVariant.Primary}
      size={ButtonSize.Lg}
      onPress={onClose}
      isFullWidth
    >
      {strings('pro_subscription.success.cta')}
    </Button>
  </Box>
);

export default Success;

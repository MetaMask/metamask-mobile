import React from 'react';
import {
  Box,
  Text,
  Icon,
  IconName,
  IconSize,
  IconColor,
  TextVariant,
  TextColor,
  BoxAlignItems,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

interface ErrorStateProps {
  /** Text describing what failed to load (e.g., "Unable to load predictions") */
  title: string;
  /** Callback for the retry button */
  onRetry: () => void;
}

/**
 * Generic error state for homepage sections.
 * Shows a wifi-off icon, error message, and a retry button.
 */
const ErrorState: React.FC<ErrorStateProps> = ({ title, onRetry }) => (
  <Box alignItems={BoxAlignItems.Center} gap={3} padding={4}>
    <Icon
      name={IconName.WifiOff}
      size={IconSize.Xl}
      color={IconColor.IconMuted}
    />
    <Text
      variant={TextVariant.BodyMd}
      color={TextColor.TextAlternative}
      twClassName="text-center"
    >
      {title}
    </Text>
    <Button
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Lg}
      onPress={onRetry}
    >
      {strings('homepage.error.retry')}
    </Button>
  </Box>
);

export default ErrorState;

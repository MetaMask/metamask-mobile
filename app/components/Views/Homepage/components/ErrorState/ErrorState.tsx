import React from 'react';
import { Image } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  BoxAlignItems,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import wifiOffIcon from '../../../../../images/wifi-off.png';
import styles from './ErrorState.styles';

interface ErrorStateProps {
  /** Text describing what failed to load (e.g., "Unable to load predictions") */
  title: string;
  /** Callback for the retry button (may be async) */
  onRetry: () => void | Promise<void>;
}

/**
 * Generic error state for homepage sections.
 * Shows a wifi-off icon, error message, and a retry button.
 */
const ErrorState: React.FC<ErrorStateProps> = ({ title, onRetry }) => {
  const handleRetry = () => {
    try {
      const result = onRetry();
      if (result instanceof Promise) {
        result.catch(() => {
          // Silently catch — the hook already handles its own error state
        });
      }
    } catch {
      // Silently catch synchronous errors
    }
  };

  return (
    <Box alignItems={BoxAlignItems.Center} gap={3} padding={4}>
      <Image source={wifiOffIcon} style={styles.icon} />
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
        onPress={handleRetry}
      >
        {strings('homepage.error.retry')}
      </Button>
    </Box>
  );
};

export default ErrorState;

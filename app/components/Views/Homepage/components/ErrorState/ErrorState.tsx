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
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useAssetFromTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import errorStateLight from '../../../../../images/error-state-no-connection-light.png';
import errorStateDark from '../../../../../images/error-state-no-connection-dark.png';

interface ErrorStateProps {
  /** Text describing what failed to load (e.g., "Unable to load predictions") */
  title: string;
  /** Callback for the retry button (may be async) */
  onRetry: () => void | Promise<void>;
}

/**
 * Generic error state for homepage sections.
 * Shows a no-connection illustration, error message, and a retry button.
 */
const ErrorState: React.FC<ErrorStateProps> = ({ title, onRetry }) => {
  const tw = useTailwind();
  const noConnectionImage = useAssetFromTheme(errorStateLight, errorStateDark);

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
      <Image
        source={noConnectionImage}
        resizeMode="contain"
        style={tw.style('w-[72px] h-[72px]')}
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
        onPress={handleRetry}
        twClassName={'self-center'}
      >
        {strings('homepage.error.retry')}
      </Button>
    </Box>
  );
};

export default ErrorState;

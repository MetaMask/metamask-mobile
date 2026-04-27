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
  /** Primary heading text (e.g. "Unable to load predictions") */
  title: string;
  /** Optional secondary description shown below the title. */
  subtitle?: string;
  /** Callback for the action button (may be async) */
  onRetry: () => void | Promise<void>;
  /** Label for the action button. Defaults to the localised "Retry" string. */
  actionLabel?: string;
  /** Optional testID forwarded to the action button. */
  actionButtonTestID?: string;
}

/**
 * Generic error / empty state.
 * Shows a no-connection illustration, a title, an optional subtitle, and an
 * action button whose label defaults to "Retry".
 */
const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  subtitle,
  onRetry,
  actionLabel,
  actionButtonTestID,
}) => {
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
        variant={TextVariant.HeadingSm}
        color={TextColor.TextDefault}
        twClassName="text-center"
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center"
        >
          {subtitle}
        </Text>
      ) : null}
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={handleRetry}
        twClassName={'self-center'}
        testID={actionButtonTestID}
      >
        {actionLabel ?? strings('homepage.error.retry')}
      </Button>
    </Box>
  );
};

export default ErrorState;

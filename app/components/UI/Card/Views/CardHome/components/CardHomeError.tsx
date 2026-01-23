import React from 'react';
import { ActivityIndicator } from 'react-native';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../../component-library/components/Icons/Icon';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../../../locales/i18n';
import { CardHomeSelectors } from '../CardHome.testIds';

interface CardHomeErrorProps {
  /** Whether this is an authentication error being handled */
  isAuthError: boolean;
  /** Whether retry is allowed */
  canRetry: boolean;
  /** Callback when retry button is pressed */
  onRetry: () => void;
}

/**
 * CardHomeError Component
 *
 * Displays an error state with an optional retry button.
 * For auth errors, shows a loading spinner while redirecting.
 */
const CardHomeError = ({
  isAuthError,
  canRetry,
  onRetry,
}: CardHomeErrorProps) => {
  // For auth errors, show loading while redirecting to authentication
  if (isAuthError) {
    return (
      <Box twClassName="flex-1 items-center justify-center bg-background-default">
        <ActivityIndicator size="large" />
      </Box>
    );
  }

  return (
    <Box twClassName="flex-1 items-center justify-center bg-background-default gap-2">
      <Icon
        name={IconName.Forest}
        size={IconSize.Xl}
        color={IconColor.Default}
      />
      <Text variant={TextVariant.HeadingSm} twClassName="text-text-alternative">
        {strings('card.card_home.error_title')}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        twClassName="text-text-alternative text-center px-12"
      >
        {strings('card.card_home.error_description')}
      </Text>
      {canRetry && (
        <Box twClassName="pt-2">
          <Button
            variant={ButtonVariants.Secondary}
            label={strings('card.card_home.try_again')}
            size={ButtonSize.Md}
            onPress={onRetry}
            testID={CardHomeSelectors.TRY_AGAIN_BUTTON}
          />
        </Box>
      )}
    </Box>
  );
};

export default CardHomeError;

import React from 'react';
import {
  Box,
  Text,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import { LeaderboardTestIds } from '../../Leaderboard.testIds';

interface LeaderboardErrorProps {
  /** Error message to display */
  error: string;
  /** Callback when retry button is pressed */
  onRetry: () => void;
}

/**
 * Error state component shown when leaderboard fetch fails
 */
const LeaderboardError: React.FC<LeaderboardErrorProps> = ({
  error,
  onRetry,
}) => (
  <Box
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Center}
    twClassName="py-16 px-4"
    testID={LeaderboardTestIds.ERROR_STATE}
  >
    <Icon name={IconName.Danger} size={IconSize.Xl} color={IconColor.Error} />
    <Text variant={TextVariant.BodyMd} twClassName="mt-4 text-center">
      {strings('leaderboard.error_title')}
    </Text>
    <Text
      variant={TextVariant.BodySm}
      twClassName="text-muted mt-2 text-center"
    >
      {error}
    </Text>
    <Button
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Md}
      onPress={onRetry}
      twClassName="mt-4"
      testID={LeaderboardTestIds.REFRESH_CONTROL}
    >
      {strings('leaderboard.retry')}
    </Button>
  </Box>
);

export default LeaderboardError;

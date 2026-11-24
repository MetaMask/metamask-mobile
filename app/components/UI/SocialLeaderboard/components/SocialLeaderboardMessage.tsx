import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../locales/i18n';
import { SocialLeaderboardSelectorsIDs } from './SocialLeaderboard.testIds';

export interface SocialLeaderboardMessageProps {
  message: string;
  testID: string;
  /** Shows a retry button when set. */
  onRetry?: () => void;
}

/** Shown in place of the rows for the empty, unavailable and error states. */
const SocialLeaderboardMessage: React.FC<SocialLeaderboardMessageProps> = ({
  message,
  testID,
  onRetry,
}) => (
  <Box
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Center}
    twClassName="w-full px-4 py-8 gap-3"
    testID={testID}
  >
    <Text
      variant={TextVariant.BodyMd}
      color={TextColor.TextAlternative}
      twClassName="text-center"
    >
      {message}
    </Text>
    {onRetry ? (
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Sm}
        onPress={onRetry}
        twClassName="self-center"
        testID={SocialLeaderboardSelectorsIDs.RETRY}
      >
        {strings('social_leaderboard.feed.error.retry')}
      </Button>
    ) : null}
  </Box>
);

export default SocialLeaderboardMessage;

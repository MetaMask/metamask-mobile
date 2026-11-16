import {
  Box,
  BoxAlignItems,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import { SOCIAL_FEED_LOAD_MORE_RETRY_TEST_ID } from './SocialFeedStates.testIds';

export interface SocialFeedLoadMoreErrorProps {
  /** Fetches the page that failed. No-op when another page is already in flight. */
  onRetry: () => void;
}

/**
 * Inline notice under the last loaded row when the next page failed.
 *
 * The first page keeps {@link SocialFeedError}. VoiceOver ignores
 * `accessibilityLiveRegion`, so the message is also announced.
 */
const SocialFeedLoadMoreError: React.FC<SocialFeedLoadMoreErrorProps> = ({
  onRetry,
}) => {
  const message = strings('social_leaderboard.feed.load_more_error');

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message);
  }, [message]);

  return (
    <Box alignItems={BoxAlignItems.Center} twClassName="w-full py-4 gap-2">
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        twClassName="text-center"
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
      >
        {message}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Sm}
        onPress={onRetry}
        twClassName="self-center"
        testID={SOCIAL_FEED_LOAD_MORE_RETRY_TEST_ID}
      >
        {strings('social_leaderboard.feed.error.retry')}
      </Button>
    </Box>
  );
};

export default SocialFeedLoadMoreError;

import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../locales/i18n';
import {
  SOCIAL_FEED_ERROR_TEST_ID,
  SOCIAL_FEED_RETRY_TEST_ID,
} from './SocialFeedStates.testIds';

export interface SocialFeedErrorProps {
  /** Refetches the feed from its first page. */
  onRetry: () => void;
}

/** Shown in place of the posts when the feed failed and nothing is loaded. */
const SocialFeedError: React.FC<SocialFeedErrorProps> = ({ onRetry }) => (
  <Box
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Center}
    twClassName="w-full px-4 py-16 gap-3"
    testID={SOCIAL_FEED_ERROR_TEST_ID}
  >
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextDefault}
      twClassName="text-center"
    >
      {strings('social_leaderboard.feed.error.title')}
    </Text>
    <Button
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Sm}
      onPress={onRetry}
      twClassName="self-center"
      testID={SOCIAL_FEED_RETRY_TEST_ID}
    >
      {strings('social_leaderboard.feed.error.retry')}
    </Button>
  </Box>
);

export default SocialFeedError;

import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../locales/i18n';
import { SOCIAL_FEED_EMPTY_TEST_ID } from './SocialFeedStates.testIds';

/** Shown when a filtered feed (one token, perp or trader) has no posts. */
const SocialFeedEmpty: React.FC = () => (
  <Box
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Center}
    twClassName="w-full px-4 py-8"
    testID={SOCIAL_FEED_EMPTY_TEST_ID}
  >
    <Text
      variant={TextVariant.BodyMd}
      color={TextColor.TextAlternative}
      twClassName="text-center"
    >
      {strings('social_leaderboard.feed.empty_filtered.title')}
    </Text>
  </Box>
);

export default SocialFeedEmpty;

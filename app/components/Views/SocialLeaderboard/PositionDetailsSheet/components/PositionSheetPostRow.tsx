import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AuthorComment } from '@metamask/social-controllers';
import SocialFeedGif from '../../../../UI/SocialFeed/components/SocialFeedGif';
import TraderAvatar from '../../../../UI/SocialFeed/components/TraderAvatar';
import type { SocialV1FeedAuthor } from '../../../../UI/SocialFeed/types';
import { formatFeedPostAge } from '../../../../UI/SocialFeed/utils/formatters';
import { splitKlipyGifFromCommentText } from '../../../../UI/SocialFeed/utils/klipyGifComment';
import { PositionDetailsSheetSelectorsIDs } from '../PositionDetailsSheet.testIds';

const AVATAR_SIZE = 32;

interface PositionSheetPostRowProps {
  post: AuthorComment;
  author: SocialV1FeedAuthor;
  now?: number;
}

/** One author comment in the sheet's Posts tab, with its GIF when it has one. */
const PositionSheetPostRow: React.FC<PositionSheetPostRowProps> = ({
  post,
  author,
  now,
}) => {
  const { text, gifUrl } = splitKlipyGifFromCommentText(post.text);
  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Start}
      gap={4}
      twClassName="px-4 py-3"
      testID={`${PositionDetailsSheetSelectorsIDs.POST_ROW}-${post.uid}`}
    >
      <TraderAvatar
        imageUrl={author.avatarUri}
        address={author.id}
        size={AVATAR_SIZE}
      />
      <Box twClassName="flex-1 min-w-0">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={2}
        >
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Bold}
            numberOfLines={1}
            twClassName="shrink min-w-0"
          >
            {author.username}
          </Text>
          <Text
            variant={TextVariant.BodyXs}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextMuted}
            twClassName="shrink-0"
          >
            {formatFeedPostAge(post.timestamp, now)}
          </Text>
        </Box>
        {text ? <Text variant={TextVariant.BodySm}>{text}</Text> : null}
        {gifUrl ? (
          <Box twClassName="mt-2 rounded-2xl overflow-hidden">
            <SocialFeedGif
              uri={gifUrl}
              testID={`${PositionDetailsSheetSelectorsIDs.POST_GIF}-${post.uid}`}
            />
          </Box>
        ) : null}
      </Box>
    </Box>
  );
};

export default PositionSheetPostRow;

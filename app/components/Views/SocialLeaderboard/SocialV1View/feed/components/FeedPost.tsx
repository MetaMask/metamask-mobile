import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import TraderAvatar from '../../../../Homepage/Sections/TopTraders/components/TraderAvatar';
import WinRateTag from '../../../components/WinRateTag';
import { formatFeedPostAge } from '../../../utils/formatters';
import type { SocialV1FeedAuthor } from '../types';
import PositionCardComment from './PositionCardComment';
import {
  getSocialFeedPositionCardCommentTestId,
  getSocialFeedPositionCardTestId,
  getSocialFeedPostAgeTestId,
  getSocialFeedPostAuthorTestId,
  getSocialFeedPostAvatarTestId,
  getSocialFeedPostWinRateTestId,
} from './SocialFeedPositionCard.testIds';

const AVATAR_SIZE = 40;

export interface FeedPostProps {
  /** Post id, used to derive the test IDs and key the avatar's image cache. */
  id: string;
  author: SocialV1FeedAuthor;
  timestamp: number;
  /** Author's own words. Omitted posts render the card with no caption. */
  comment?: string;
  /** Appends the mock marker to the win-rate badge. */
  isWinRateMocked?: boolean;
  /**
   * Wall-clock instant used to format the post age. Pass a shared value so a
   * refresh recomputes every post's label together. Defaults to `Date.now()`.
   */
  now?: number;
  /** The post body -- typically a `PositionCardShell`. */
  children: React.ReactNode;
}

/**
 * FeedPost -- the Social V1 post frame: the author's avatar in a left gutter,
 * with their name, win-rate badge and the post age heading a content column
 * that holds the caption and the position card.
 *
 * The avatar sits outside the content column (and top-aligned to it) so the
 * caption and card share the name's left edge, which is what keeps a stack of
 * posts reading as one column.
 */
const FeedPost: React.FC<FeedPostProps> = ({
  id,
  author,
  timestamp,
  comment,
  isWinRateMocked = false,
  now,
  children,
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Start}
    gap={3}
    testID={getSocialFeedPositionCardTestId(id)}
  >
    <TraderAvatar
      imageUrl={author.avatarUri}
      address={author.address}
      size={AVATAR_SIZE}
      recyclingKey={id}
      testID={getSocialFeedPostAvatarTestId(id)}
    />

    {/* `min-w-0` lets the username truncate instead of pushing the post age
      off the right edge. */}
    <Box twClassName="flex-1 min-w-0 gap-2">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={2}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={2}
          twClassName="flex-1 min-w-0"
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextDefault}
            numberOfLines={1}
            twClassName="shrink"
            testID={getSocialFeedPostAuthorTestId(id)}
          >
            {author.username}
          </Text>
          <WinRateTag
            winRatePercent={author.winRatePercent}
            isMocked={isWinRateMocked}
            testID={getSocialFeedPostWinRateTestId(id)}
          />
        </Box>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          numberOfLines={1}
          twClassName="shrink-0"
          testID={getSocialFeedPostAgeTestId(id)}
        >
          {formatFeedPostAge(timestamp, now)}
        </Text>
      </Box>

      <PositionCardComment
        comment={comment}
        testID={getSocialFeedPositionCardCommentTestId(id)}
      />

      {children}
    </Box>
  </Box>
);

export default FeedPost;

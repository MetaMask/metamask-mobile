import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  Tag,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { Image } from 'react-native';
import superheroAvatar from '../../../../../../images/socialV1/superhero.png';
import { formatFeedTimestamp } from '../../../utils/formatters';
import type { SocialV1FeedPost } from '../types';
import { PositionCardBody } from './SocialFeedPositionCard';
import { SocialFeedPostShellSelectorsIDs } from './SocialFeedPostShell.testIds';

export interface SocialFeedPostShellProps {
  post: SocialV1FeedPost;
}

const SocialFeedPostShell: React.FC<SocialFeedPostShellProps> = ({ post }) => {
  const tw = useTailwind();

  return (
    <Box
      twClassName="gap-3"
      testID={`${SocialFeedPostShellSelectorsIDs.CONTAINER}-${post.id}`}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={2}
          twClassName="flex-1 min-w-0"
        >
          <Image
            source={
              post.authorImageUrl
                ? { uri: post.authorImageUrl }
                : superheroAvatar
            }
            style={tw.style('h-8 w-8 rounded-full')}
          />
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            numberOfLines={1}
          >
            {post.authorHandle}
          </Text>
          {post.winRateLabel ? (
            <Tag style={tw.style('mt-2')}>{post.winRateLabel}</Tag>
          ) : null}
        </Box>
        <Text variant={TextVariant.BodySm} color={TextColor.TextMuted}>
          {formatFeedTimestamp(post.timestampMs)}
        </Text>
      </Box>

      {post.item.comment ? (
        <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
          {post.item.comment}
        </Text>
      ) : null}

      <PositionCardBody item={post.item} />

      {post.gifUri ? (
        <Box twClassName="rounded-2xl overflow-hidden">
          <Image
            source={{ uri: post.gifUri }}
            style={tw.style('w-full aspect-square')}
            testID={`${SocialFeedPostShellSelectorsIDs.GIF}-${post.id}`}
          />
        </Box>
      ) : null}

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={4}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
        >
          <Icon name={IconName.HeartStraight} size={IconSize.Sm} />
          <Text variant={TextVariant.BodySm} color={TextColor.TextMuted}>
            {post.likeCount}
          </Text>
        </Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
        >
          <Icon name={IconName.Messages} size={IconSize.Sm} />
          <Text variant={TextVariant.BodySm} color={TextColor.TextMuted}>
            {post.commentCount}
          </Text>
        </Box>
        <Box twClassName="flex-1" />
        <Icon name={IconName.MoreHorizontal} size={IconSize.Sm} />
      </Box>
    </Box>
  );
};

export default SocialFeedPostShell;

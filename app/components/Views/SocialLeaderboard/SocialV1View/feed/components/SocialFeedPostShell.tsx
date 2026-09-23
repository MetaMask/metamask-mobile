import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useMemo } from 'react';
import { Image } from 'react-native';
import superheroAvatar from '../../../../../../images/socialV1/superhero.png';
import { formatFeedTimestamp } from '../../../utils/formatters';
import { MOCK_MARKER } from '../mockMarker';
import type { SocialV1FeedPost } from '../types';
import {
  buildTraderStatLabels,
  resolveTraderCohort,
  traderCohortEmoji,
} from '../utils/traderStats';
import RotatingTraderStat from './RotatingTraderStat';
import { PositionCardBody } from './SocialFeedPositionCard';
import { SocialFeedPostShellSelectorsIDs } from './SocialFeedPostShell.testIds';

export interface SocialFeedPostShellProps {
  post: SocialV1FeedPost;
}

const SocialFeedPostShell: React.FC<SocialFeedPostShellProps> = ({ post }) => {
  const tw = useTailwind();
  const author = post.item.author;
  const statLabels = useMemo(() => buildTraderStatLabels(author), [author]);
  const cohortEmoji = traderCohortEmoji(resolveTraderCohort(author.pnl30d));

  return (
    <Box
      twClassName="gap-3"
      testID={`${SocialFeedPostShellSelectorsIDs.CONTAINER}-${post.id}`}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="mb-2"
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
          {/* The name row and the stat line share a column so the stats sit
              under the name rather than under the avatar. */}
          <Box twClassName="flex-1 min-w-0">
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={1}
            >
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
                numberOfLines={1}
                twClassName="shrink"
              >
                {post.authorHandle}
              </Text>
              {/* Nothing reports verification yet, so the badge is invented
                  and carries the mock marker every fabricated value does. */}
              <Icon
                name={IconName.VerifiedFilled}
                size={IconSize.Sm}
                twClassName="text-info-default shrink-0"
                testID={SocialFeedPostShellSelectorsIDs.VERIFIED_BADGE}
              />
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextMuted}
                twClassName="shrink-0"
              >
                {MOCK_MARKER}
              </Text>
              {cohortEmoji ? (
                <Text
                  variant={TextVariant.BodySm}
                  twClassName="shrink-0"
                  testID={SocialFeedPostShellSelectorsIDs.COHORT}
                >
                  {cohortEmoji}
                </Text>
              ) : null}
            </Box>
            <RotatingTraderStat
              labels={statLabels}
              testID={SocialFeedPostShellSelectorsIDs.TRADER_STAT}
            />
          </Box>
        </Box>
        <Text variant={TextVariant.BodySm} color={TextColor.TextMuted}>
          {formatFeedTimestamp(post.timestampMs)}
        </Text>
      </Box>

      {post.item.comment ? (
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextDefault}
          twClassName="mb-2"
        >
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

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
import React, { useCallback, useRef, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import superheroAvatar from '../../../../../../images/socialV1/superhero.png';
import { formatFeedTimestamp } from '../../../utils/formatters';
import { useFeedPostReaction } from '../hooks/useFeedPostReaction';
import { totalReactionCount, visibleReactions } from '../reactions';
import type { SocialV1FeedPost } from '../types';
import ReactionPickerBalloon, {
  type ReactionPickerAnchor,
} from './ReactionPickerBalloon';
import { PositionCardBody } from './SocialFeedPositionCard';
import { SocialFeedPostShellSelectorsIDs } from './SocialFeedPostShell.testIds';

export interface SocialFeedPostShellProps {
  post: SocialV1FeedPost;
}

const SocialFeedPostShell: React.FC<SocialFeedPostShellProps> = ({ post }) => {
  const tw = useTailwind();
  const reactionAnchorRef = useRef<View>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerAnchor, setPickerAnchor] = useState<ReactionPickerAnchor | null>(
    null,
  );
  const { reactions, pickEmotion } = useFeedPostReaction(
    post.commentId,
    post.reactions,
    post.userReaction ?? null,
  );

  const chips = visibleReactions(reactions);
  const total = totalReactionCount(reactions);

  const openPicker = useCallback(() => {
    reactionAnchorRef.current?.measureInWindow((x, y, width, height) => {
      setPickerAnchor({ x, y, width, height });
      setPickerVisible(true);
    });
  }, []);

  const closePicker = useCallback(() => {
    setPickerVisible(false);
  }, []);

  const handlePick = useCallback(
    (emotion: string) => {
      setPickerVisible(false);
      void pickEmotion(emotion);
    },
    [pickEmotion],
  );

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

      {post.commentId ? (
        <View ref={reactionAnchorRef} collapsable={false}>
          <Pressable
            accessibilityRole="button"
            testID={`${SocialFeedPostShellSelectorsIDs.REACTIONS}-${post.id}`}
            onPress={openPicker}
          >
            {chips.length === 0 ? (
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
              >
                <Icon name={IconName.HeartStraight} size={IconSize.Sm} />
              </Box>
            ) : (
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={2}
              >
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextMuted}
                  testID={`${SocialFeedPostShellSelectorsIDs.TOTAL}-${post.id}`}
                >
                  {total}
                </Text>
                {chips.map((reaction) => (
                  <Box
                    key={reaction.emotion}
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    gap={1}
                    testID={`${SocialFeedPostShellSelectorsIDs.CHIP}-${post.id}-${reaction.emotion}`}
                  >
                    <Text variant={TextVariant.BodySm}>{reaction.emotion}</Text>
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextMuted}
                    >
                      {reaction.count}
                    </Text>
                  </Box>
                ))}
              </Box>
            )}
          </Pressable>
        </View>
      ) : null}

      <ReactionPickerBalloon
        visible={pickerVisible}
        anchor={pickerAnchor}
        onClose={closePicker}
        onPick={handlePick}
      />
    </Box>
  );
};

export default SocialFeedPostShell;

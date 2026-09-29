import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSocialEntryOptions } from '../../../components/SocialEntryOptionsBottomSheet';
import SocialTraderIdentityRow from '../../../components/SocialTraderIdentityRow';
import { useFeedPostReaction } from '../hooks/useFeedPostReaction';
import { visibleReactions } from '../reactions';
import type { SocialV1FeedPost } from '../types';
import ReactionChip from './ReactionChip';
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
  const optionsTarget = useMemo(
    () => ({
      postId: post.id,
      authorId: post.item.author.id,
      authorHandle: post.authorHandle,
    }),
    [post.authorHandle, post.id, post.item.author.id],
  );
  const {
    open: openOptions,
    sheet: optionsSheet,
    isHidden,
  } = useSocialEntryOptions(optionsTarget);
  const [pickerAnchor, setPickerAnchor] = useState<ReactionPickerAnchor | null>(
    null,
  );
  const { reactions, pickEmotion } = useFeedPostReaction(
    post.commentId,
    post.reactions,
    post.userReaction ?? null,
  );

  const chips = visibleReactions(reactions);

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
      pickEmotion(emotion).catch(() => undefined);
    },
    [pickEmotion],
  );

  if (isHidden) {
    return null;
  }

  return (
    <Box
      twClassName="gap-3"
      testID={`${SocialFeedPostShellSelectorsIDs.CONTAINER}-${post.id}`}
    >
      <SocialTraderIdentityRow
        author={post.item.author}
        handle={post.authorHandle}
        imageUrl={post.authorImageUrl}
        timestampMs={post.timestampMs}
        recyclingKey={post.id}
        onMorePress={openOptions}
        twClassName="mb-2"
        testIDs={{
          avatar: `${SocialFeedPostShellSelectorsIDs.AVATAR}-${post.id}`,
          verifiedBadge: SocialFeedPostShellSelectorsIDs.VERIFIED_BADGE,
          cohort: SocialFeedPostShellSelectorsIDs.COHORT,
          timestamp: `${SocialFeedPostShellSelectorsIDs.TIMESTAMP}-${post.id}`,
          traderStat: SocialFeedPostShellSelectorsIDs.TRADER_STAT,
          more: `${SocialFeedPostShellSelectorsIDs.MORE}-${post.id}`,
        }}
      />

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

      <View
        ref={reactionAnchorRef}
        collapsable={false}
        style={tw.style('self-start')}
      >
        <Pressable
          accessibilityRole="button"
          testID={`${SocialFeedPostShellSelectorsIDs.REACTIONS}-${post.id}`}
          onPress={openPicker}
        >
          {chips.length === 0 ? (
            <Animated.View
              entering={FadeIn.duration(140)}
              exiting={FadeOut.duration(100)}
            >
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="pl-2"
              >
                <Icon name={IconName.HeartStraight} size={IconSize.Sm} />
              </Box>
            </Animated.View>
          ) : (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={2}
            >
              {chips.map((reaction) => (
                <ReactionChip
                  key={reaction.emotion}
                  emotion={reaction.emotion}
                  count={reaction.count}
                  testID={`${SocialFeedPostShellSelectorsIDs.CHIP}-${post.id}-${reaction.emotion}`}
                />
              ))}
            </Box>
          )}
        </Pressable>
      </View>

      <ReactionPickerBalloon
        visible={pickerVisible}
        anchor={pickerAnchor}
        onClose={closePicker}
        onPick={handlePick}
      />
      {optionsSheet}
    </Box>
  );
};

export default SocialFeedPostShell;

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
import { strings } from '../../../../../locales/i18n';
import { useSocialEntryOptions } from './SocialEntryOptionsBottomSheet';
import SocialTraderIdentityRow from './SocialTraderIdentityRow';
import { useCopyTradeToPerps } from '../hooks/useCopyTradeToPerps';
import { useFeedPostReaction } from '../hooks/useFeedPostReaction';
import { mockCopyCount } from '../mocks/socialV1Enrichment';
import { markMocked } from '../mockMarker';
import { visibleReactions } from '../reactions';
import type { SocialV1FeedPost } from '../types';
import { isCopyTradeable } from '../utils/copyTrade';
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
  const { onCopyTrade, geoBlockSheet } = useCopyTradeToPerps(post.item);

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

  // Only a position that is still open can be copied, so only those can have
  // been. Zero copies say nothing worth the row space.
  const copyCount = isCopyTradeable(post.item) ? mockCopyCount(post.id) : 0;

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

      <PositionCardBody item={post.item} onCopyTrade={onCopyTrade} />

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
        gap={3}
      >
        <View ref={reactionAnchorRef} collapsable={false}>
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

        {/* Inert on purpose: the count is context for the reactions next to it,
            not a way into a list of who copied. */}
        {copyCount > 0 ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            testID={`${SocialFeedPostShellSelectorsIDs.COPIES}-${post.id}`}
          >
            {markMocked(
              strings('social_leaderboard.feed.copies', { count: copyCount }),
            )}
          </Text>
        ) : null}
      </Box>

      <ReactionPickerBalloon
        visible={pickerVisible}
        anchor={pickerAnchor}
        onClose={closePicker}
        onPick={handlePick}
      />
      {optionsSheet}
      {geoBlockSheet}
    </Box>
  );
};

export default SocialFeedPostShell;

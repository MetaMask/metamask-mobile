import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
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
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import TraderAvatar from '../../../../Homepage/Sections/TopTraders/components/TraderAvatar';
import { strings } from '../../../../../../../locales/i18n';
import { useSocialEntryOptions } from '../../../components/SocialEntryOptionsBottomSheet';
import { formatFeedPostAge } from '../../../utils/formatters';
import { useFeedPostReaction } from '../hooks/useFeedPostReaction';
import { MOCK_MARKER } from '../mockMarker';
import { visibleReactions } from '../reactions';
import type { SocialV1FeedPost } from '../types';
import {
  buildTraderStatLabels,
  resolveTraderCohort,
  traderCohortEmoji,
} from '../utils/traderStats';
import ReactionChip from './ReactionChip';
import ReactionPickerBalloon, {
  type ReactionPickerAnchor,
} from './ReactionPickerBalloon';
import RotatingTraderStat from './RotatingTraderStat';
import { PositionCardBody } from './SocialFeedPositionCard';
import { SocialFeedPostShellSelectorsIDs } from './SocialFeedPostShell.testIds';

export interface SocialFeedPostShellProps {
  post: SocialV1FeedPost;
}

/** Matches the previous `h-8 w-8` author image. */
const AVATAR_SIZE = 32;

const SocialFeedPostShell: React.FC<SocialFeedPostShellProps> = ({ post }) => {
  const tw = useTailwind();
  const reactionAnchorRef = useRef<View>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const { open: openOptions, sheet: optionsSheet } = useSocialEntryOptions();
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
          <TraderAvatar
            imageUrl={post.authorImageUrl}
            // Profile id seeds the Maskicon. Ids that do not start with `0x`
            // are hashed in full, so each trader stays distinct once wallet
            // addresses leave the feed payload.
            address={post.item.author.id}
            size={AVATAR_SIZE}
            recyclingKey={post.id}
            testID={`${SocialFeedPostShellSelectorsIDs.AVATAR}-${post.id}`}
          />
          {/* The name row and the stat line share a column so the stats sit
              under the name rather than under the avatar. */}
          <Box twClassName="flex-1 min-w-0 overflow-hidden">
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
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextMuted}
                twClassName="shrink-0"
                testID={`${SocialFeedPostShellSelectorsIDs.TIMESTAMP}-${post.id}`}
              >
                {formatFeedPostAge(post.timestampMs)}
              </Text>
            </Box>
            <RotatingTraderStat
              labels={statLabels}
              testID={SocialFeedPostShellSelectorsIDs.TRADER_STAT}
            />
          </Box>
        </Box>
        <ButtonIcon
          iconName={IconName.MoreHorizontal}
          size={ButtonIconSize.Md}
          onPress={openOptions}
          accessibilityLabel={strings('social_leaderboard.entry_options.title')}
          twClassName="shrink-0"
          testID={`${SocialFeedPostShellSelectorsIDs.MORE}-${post.id}`}
        />
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

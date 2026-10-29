import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonBase,
  ButtonBaseSize,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import EmojiAddIcon from '../../../../images/emoji-add.svg';
import { useTheme } from '../../../../util/theme';
import { EnsureAccessRestricted } from '../../Compliance/contexts/AccessRestrictedContext';
import { useRequireSocialProfileOnboarding } from '../../../Views/SocialLeaderboard/hooks/useRequireSocialProfileOnboarding';
import { useSocialTermsGate } from '../../../Views/SocialLeaderboard/terms/useSocialTermsGate';
import { useSocialEntryOptions } from './SocialEntryOptionsBottomSheet';
import SocialTraderIdentityRow from './SocialTraderIdentityRow';
import { useCopyTradeToPerps } from '../hooks/useCopyTradeToPerps';
import { useFeedPostReaction } from '../hooks/useFeedPostReaction';
import { visibleReactions } from '../reactions';
import type { SocialV1FeedPost } from '../types';
import ReactionChip, { REACTION_PILL_TW_CLASS } from './ReactionChip';
import SocialFeedPostTranslation from './SocialFeedPostTranslation';
import ReactionPickerBalloon, {
  type ReactionPickerAnchor,
} from './ReactionPickerBalloon';
import { PositionCardBody } from './SocialFeedPositionCard';
import SocialFeedGif from './SocialFeedGif';
import { useSocialFeedTracking } from '../socialFeedTracking';
import { SocialFeedPostShellSelectorsIDs } from './SocialFeedPostShell.testIds';

export interface SocialFeedPostShellProps {
  post: SocialV1FeedPost;
  onCopyTrade?: (item: SocialV1FeedPost['item'], commentId?: string) => void;
  onCopyTradeInteraction?: (tradeType: 'perps' | 'spot') => void;
  onReactionInteraction?: (
    action: 'added' | 'removed',
    emotion: string,
  ) => void;
  onReactionPickerOpened?: () => void;
  onAuthorPress?: (post: SocialV1FeedPost) => void;
  /** Opens the position details. The card's own buttons keep their press. */
  onPositionPress?: (post: SocialV1FeedPost) => void;
  /** Gates interactions when the post is rendered on a Social V1 surface. */
  requireSocialTerms?: boolean;
  /** Clock for the relative timestamp. Defaults to `Date.now()`. */
  now?: number;
}

const SocialFeedPostShell: React.FC<SocialFeedPostShellProps> = ({
  post,
  onCopyTrade: onSpotCopyTrade,
  onCopyTradeInteraction,
  onReactionInteraction,
  onReactionPickerOpened,
  onAuthorPress,
  onPositionPress,
  requireSocialTerms = false,
  now,
}) => {
  const tracked = useSocialFeedTracking();
  const notifyCopy = onCopyTradeInteraction ?? tracked.onCopyTradeInteraction;
  const notifyReaction = onReactionInteraction ?? tracked.onReactionInteraction;
  const notifyPicker = onReactionPickerOpened ?? tracked.onReactionPickerOpened;
  const tw = useTailwind();
  const { colors } = useTheme();
  const reactionAnchorRef = useRef<View>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const { ensureSocialProfileOnboarding } = useRequireSocialProfileOnboarding();
  const { ensureSocialTermsAccepted } = useSocialTermsGate();
  const ensureSocialTermsForInteraction = useCallback(
    () => !requireSocialTerms || ensureSocialTermsAccepted(),
    [ensureSocialTermsAccepted, requireSocialTerms],
  );
  const optionsTarget = useMemo(
    () => ({
      postId: post.id,
      authorId: post.item.author.id,
      authorHandle: post.authorHandle,
      commentId: post.commentId,
    }),
    [post.authorHandle, post.commentId, post.id, post.item.author.id],
  );
  const {
    open: openEntryOptions,
    sheet: optionsSheet,
    isHidden,
  } = useSocialEntryOptions(optionsTarget);
  const openOptions = useCallback(() => {
    if (!ensureSocialTermsForInteraction()) {
      return;
    }
    openEntryOptions();
  }, [ensureSocialTermsForInteraction, openEntryOptions]);
  const [pickerAnchor, setPickerAnchor] = useState<ReactionPickerAnchor | null>(
    null,
  );
  const { reactions, userReaction, isPending, pickEmotion } =
    useFeedPostReaction(
      post.commentId,
      post.reactions,
      post.userReaction ?? null,
    );
  const { onCopyTrade: onPerpsCopyTrade, geoBlockSheet } = useCopyTradeToPerps(
    post.item,
    post.commentId,
  );
  // Perps opens the order sheet. Spot hands the item to the feed so QuickBuy
  // can target that token. A closed position has nothing to copy.
  const handleSpotCopyTrade = useCallback(() => {
    if (!ensureSocialTermsForInteraction()) {
      return;
    }
    notifyCopy?.('spot');
    onSpotCopyTrade?.(post.item, post.commentId);
  }, [
    ensureSocialTermsForInteraction,
    notifyCopy,
    onSpotCopyTrade,
    post.item,
    post.commentId,
  ]);
  const handlePerpsCopyTrade = useCallback(() => {
    if (!ensureSocialTermsForInteraction()) {
      return;
    }
    notifyCopy?.('perps');
    onPerpsCopyTrade?.();
  }, [ensureSocialTermsForInteraction, notifyCopy, onPerpsCopyTrade]);
  const copyTradeHandler =
    post.item.variant === 'perpsOpen'
      ? onPerpsCopyTrade
        ? handlePerpsCopyTrade
        : undefined
      : onSpotCopyTrade
        ? handleSpotCopyTrade
        : undefined;

  const chips = visibleReactions(reactions);

  const openPicker = useCallback(() => {
    if (
      !ensureSocialTermsForInteraction() ||
      !ensureSocialProfileOnboarding()
    ) {
      return;
    }

    reactionAnchorRef.current?.measureInWindow((x, y, width, height) => {
      setPickerAnchor({ x, y, width, height });
      setPickerVisible(true);
      notifyPicker?.();
    });
  }, [
    ensureSocialProfileOnboarding,
    ensureSocialTermsForInteraction,
    notifyPicker,
  ]);

  const closePicker = useCallback(() => {
    setPickerVisible(false);
  }, []);

  const toggleEmotion = useCallback(
    (emotion: string) => {
      if (
        !ensureSocialTermsForInteraction() ||
        !ensureSocialProfileOnboarding() ||
        isPending
      ) {
        return;
      }

      notifyReaction?.(userReaction === emotion ? 'removed' : 'added', emotion);
      pickEmotion(emotion).catch(() => undefined);
    },
    [
      ensureSocialProfileOnboarding,
      ensureSocialTermsForInteraction,
      isPending,
      notifyReaction,
      pickEmotion,
      userReaction,
    ],
  );

  const handlePick = useCallback(
    (emotion: string) => {
      setPickerVisible(false);
      toggleEmotion(emotion);
    },
    [toggleEmotion],
  );

  const handleIdentityPress = useCallback(() => {
    if (!ensureSocialTermsForInteraction()) {
      return;
    }
    tracked.onAuthorTap?.();
    onAuthorPress?.(post);
  }, [ensureSocialTermsForInteraction, onAuthorPress, post, tracked]);

  const handlePositionPress = useCallback(() => {
    if (!ensureSocialTermsForInteraction()) {
      return;
    }
    tracked.onPositionTap?.(
      post.item.variant === 'perpsOpen' || post.item.variant === 'perpsClosed'
        ? 'perps'
        : 'spot',
    );
    onPositionPress?.(post);
  }, [ensureSocialTermsForInteraction, onPositionPress, post, tracked]);

  if (isHidden) {
    return null;
  }

  return (
    <Box
      twClassName={post.isPending ? 'py-2 opacity-60' : 'py-2'}
      testID={`${SocialFeedPostShellSelectorsIDs.CONTAINER}-${post.id}`}
    >
      <SocialTraderIdentityRow
        author={post.item.author}
        handle={post.authorHandle}
        imageUrl={post.authorImageUrl}
        timestampMs={post.timestampMs}
        now={now}
        recyclingKey={post.id}
        onMorePress={openOptions}
        onIdentityPress={onAuthorPress ? handleIdentityPress : undefined}
        testIDs={{
          avatar: `${SocialFeedPostShellSelectorsIDs.AVATAR}-${post.id}`,
          timestamp: `${SocialFeedPostShellSelectorsIDs.TIMESTAMP}-${post.id}`,
          traderStat: SocialFeedPostShellSelectorsIDs.TRADER_STAT,
          more: `${SocialFeedPostShellSelectorsIDs.MORE}-${post.id}`,
          identityPress: `${SocialFeedPostShellSelectorsIDs.IDENTITY_PRESS}-${post.id}`,
        }}
      >
        {post.isPending ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            testID={`${SocialFeedPostShellSelectorsIDs.PENDING}-${post.id}`}
          >
            {strings('social_leaderboard.composer.posting')}
          </Text>
        ) : null}
        {post.item.comment ? <SocialFeedPostTranslation post={post} /> : null}

        {onPositionPress ? (
          <Pressable
            accessibilityRole="button"
            onPress={handlePositionPress}
            testID={`${SocialFeedPostShellSelectorsIDs.POSITION_PRESS}-${post.id}`}
          >
            <PositionCardBody item={post.item} onCopyTrade={copyTradeHandler} />
          </Pressable>
        ) : (
          <PositionCardBody item={post.item} onCopyTrade={copyTradeHandler} />
        )}

        {post.gifUri ? (
          <Box twClassName="rounded-2xl overflow-hidden">
            <SocialFeedGif
              uri={post.gifUri}
              testID={`${SocialFeedPostShellSelectorsIDs.GIF}-${post.id}`}
            />
          </Box>
        ) : null}

        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          gap={3}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
            twClassName="flex-1 min-w-0 flex-wrap"
          >
            {chips.map((reaction) => (
              <ReactionChip
                key={reaction.emotion}
                emotion={reaction.emotion}
                count={reaction.count}
                isSelected={reaction.emotion === userReaction}
                onPress={() => toggleEmotion(reaction.emotion)}
                testID={`${SocialFeedPostShellSelectorsIDs.CHIP}-${post.id}-${reaction.emotion}`}
              />
            ))}
            <View ref={reactionAnchorRef} collapsable={false}>
              <ButtonBase
                size={ButtonBaseSize.Sm}
                twClassName={`${REACTION_PILL_TW_CLASS} border-muted w-8 px-0`}
                accessibilityLabel={strings(
                  'social_leaderboard.feed.add_reaction',
                )}
                onPress={openPicker}
                testID={`${SocialFeedPostShellSelectorsIDs.REACTIONS}-${post.id}`}
              >
                <EmojiAddIcon
                  width={16}
                  height={16}
                  color={colors.icon.alternative}
                  name="emoji-add"
                />
              </ButtonBase>
            </View>
          </Box>

          {/* Inert on purpose: the count is context for the reactions next to it,
            not a way into a list of who copied. Absent on social-api builds
            that predate it, where it would otherwise read as a false zero. */}
          {post.copyCount !== undefined ? (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={1}
              testID={`${SocialFeedPostShellSelectorsIDs.COPIES}-${post.id}`}
            >
              <Icon
                name={IconName.SwapHorizontal}
                size={IconSize.Sm}
                color={IconColor.IconAlternative}
              />
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {post.copyCount}
              </Text>
            </Box>
          ) : null}
        </Box>
      </SocialTraderIdentityRow>

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

const SocialFeedPostShellWithCompliance: React.FC<
  React.ComponentProps<typeof SocialFeedPostShell>
> = (props) => (
  <EnsureAccessRestricted>
    <SocialFeedPostShell {...props} />
  </EnsureAccessRestricted>
);

export default SocialFeedPostShellWithCompliance;

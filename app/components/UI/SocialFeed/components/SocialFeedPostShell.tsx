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
import { Pressable, View } from 'react-native';
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
import { visibleReactions, type FeedReaction } from '../reactions';
import type { SocialV1FeedPost } from '../types';
import AnimatedCount from './AnimatedCount';
import ReactionChip, {
  REACTION_PILL_TW_CLASS,
  type EmojiWindowFrame,
} from './ReactionChip';
import ReactionEmojiBurst from './ReactionEmojiBurst';
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
  /**
   * Gates Copy trade behind a linked social wallet. Social V1 hosts pass
   * this; token details and other embeds leave it off.
   */
  requireSocialProfile?: boolean;
  /**
   * Set `false` to hide Copy trade on an open card. The owner's profile posts
   * pass this so they cannot copy their own trade.
   */
  showCopyTrade?: boolean;
  /** Clock for the relative timestamp. Defaults to `Date.now()`. */
  now?: number;
}

const useShellCopyTrade = (
  post: SocialV1FeedPost,
  onSpotCopyTrade: SocialFeedPostShellProps['onCopyTrade'],
  notifyCopy: ((tradeType: 'perps' | 'spot') => void) | undefined,
  ensureCopyTradeAllowed: () => boolean,
) => {
  const { onCopyTrade: onPerpsCopyTrade, geoBlockSheet } = useCopyTradeToPerps(
    post.item,
    post.commentId,
  );
  // Perps opens the order sheet. Spot hands the item to the feed so QuickBuy
  // can target that token. A closed position has nothing to copy.
  const handleSpotCopyTrade = useCallback(() => {
    if (!ensureCopyTradeAllowed()) {
      return;
    }
    notifyCopy?.('spot');
    onSpotCopyTrade?.(post.item, post.commentId);
  }, [
    ensureCopyTradeAllowed,
    notifyCopy,
    onSpotCopyTrade,
    post.item,
    post.commentId,
  ]);
  const handlePerpsCopyTrade = useCallback(() => {
    if (!ensureCopyTradeAllowed()) {
      return;
    }
    notifyCopy?.('perps');
    onPerpsCopyTrade?.();
  }, [ensureCopyTradeAllowed, notifyCopy, onPerpsCopyTrade]);
  const copyTradeHandler =
    post.item.variant === 'perpsOpen'
      ? onPerpsCopyTrade && handlePerpsCopyTrade
      : onSpotCopyTrade && handleSpotCopyTrade;

  return { copyTradeHandler, geoBlockSheet };
};

interface SocialFeedPostFooterProps {
  postId: string;
  canReact: boolean;
  copyCount: number | undefined;
  chips: FeedReaction[];
  userReaction: string | null;
  burst: { key: number; emotion: string } | null;
  onToggleEmotion: (emotion: string) => void;
  onBurstAnchor: (nonce: number, frame: EmojiWindowFrame) => void;
  onOpenPicker: () => void;
  reactionAnchorRef: React.RefObject<View | null>;
  emojiColor: string;
}

/** Reactions and the copy count under a post. Renders nothing when both are absent. */
const SocialFeedPostFooter = ({
  postId,
  canReact,
  copyCount,
  chips,
  userReaction,
  burst,
  onToggleEmotion,
  onBurstAnchor,
  onOpenPicker,
  reactionAnchorRef,
  emojiColor,
}: SocialFeedPostFooterProps) => {
  if (!canReact && copyCount === undefined) {
    return null;
  }

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={
        canReact ? BoxJustifyContent.Between : BoxJustifyContent.End
      }
      gap={3}
    >
      {canReact ? (
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
              onPress={() => onToggleEmotion(reaction.emotion)}
              burstNonce={
                burst?.emotion === reaction.emotion ? burst.key : undefined
              }
              onBurstAnchor={onBurstAnchor}
              testID={`${SocialFeedPostShellSelectorsIDs.CHIP}-${postId}-${reaction.emotion}`}
            />
          ))}
          <View ref={reactionAnchorRef} collapsable={false}>
            <ButtonBase
              size={ButtonBaseSize.Sm}
              twClassName={`${REACTION_PILL_TW_CLASS} border-muted w-8 px-0`}
              accessibilityLabel={strings(
                'social_leaderboard.feed.add_reaction',
              )}
              onPress={onOpenPicker}
              testID={`${SocialFeedPostShellSelectorsIDs.REACTIONS}-${postId}`}
            >
              <EmojiAddIcon
                width={16}
                height={16}
                color={emojiColor}
                name="emoji-add"
              />
            </ButtonBase>
          </View>
        </Box>
      ) : null}

      {/* Inert on purpose: the count is context, not a way into a list
          of who copied. Absent on social-api builds that predate it, where
          it would otherwise read as a false zero. */}
      {copyCount !== undefined ? (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
          testID={`${SocialFeedPostShellSelectorsIDs.COPIES}-${postId}`}
        >
          <Icon
            name={IconName.SwapHorizontal}
            size={IconSize.Sm}
            color={IconColor.IconAlternative}
          />
          <AnimatedCount value={copyCount} />
        </Box>
      ) : null}
    </Box>
  );
};

const SocialFeedPostShell: React.FC<SocialFeedPostShellProps> = ({
  post,
  onCopyTrade: onSpotCopyTrade,
  onCopyTradeInteraction,
  onReactionInteraction,
  onReactionPickerOpened,
  onAuthorPress,
  onPositionPress,
  requireSocialTerms = false,
  requireSocialProfile = false,
  showCopyTrade = true,
  now,
}) => {
  const tracked = useSocialFeedTracking();
  const notifyCopy = onCopyTradeInteraction ?? tracked.onCopyTradeInteraction;
  const notifyReaction = onReactionInteraction ?? tracked.onReactionInteraction;
  const notifyPicker = onReactionPickerOpened ?? tracked.onReactionPickerOpened;
  const tw = useTailwind();
  const { colors } = useTheme();
  const reactionAnchorRef = useRef<View>(null);
  const postRef = useRef<View>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const { ensureSocialProfileOnboarding } = useRequireSocialProfileOnboarding();
  const { ensureSocialTermsAccepted } = useSocialTermsGate();
  const ensureSocialTermsForInteraction = useCallback(
    () => !requireSocialTerms || ensureSocialTermsAccepted(),
    [ensureSocialTermsAccepted, requireSocialTerms],
  );
  const ensureCopyTradeAllowed = useCallback(() => {
    if (!ensureSocialTermsForInteraction()) {
      return false;
    }
    if (requireSocialProfile && !ensureSocialProfileOnboarding()) {
      return false;
    }
    return true;
  }, [
    ensureSocialProfileOnboarding,
    ensureSocialTermsForInteraction,
    requireSocialProfile,
  ]);
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
  const [burst, setBurst] = useState<{
    key: number;
    emotion: string;
    x?: number;
    y?: number;
  } | null>(null);
  const burstSerial = useRef(0);
  const clearBurst = useCallback((finishedKey: number) => {
    setBurst((current) => {
      if (current?.key !== finishedKey) {
        return current;
      }
      return null;
    });
  }, []);
  const celebrateReaction = useCallback((emotion: string) => {
    burstSerial.current += 1;
    setBurst({ key: burstSerial.current, emotion });
  }, []);
  const placeBurst = useCallback((nonce: number, frame: EmojiWindowFrame) => {
    postRef.current?.measureInWindow((postX, postY) => {
      setBurst((current) => {
        if (current?.key !== nonce) {
          return current;
        }
        return {
          ...current,
          x: frame.x - postX + frame.width / 2,
          y: frame.y - postY + frame.height / 2,
        };
      });
    });
  }, []);
  const { reactions, userReaction, isPending, pickEmotion } =
    useFeedPostReaction(
      post.commentId,
      post.reactions,
      post.userReaction ?? null,
    );
  const { copyTradeHandler, geoBlockSheet } = useShellCopyTrade(
    post,
    onSpotCopyTrade,
    notifyCopy,
    ensureCopyTradeAllowed,
  );

  const chips = visibleReactions(reactions);
  const canReact = Boolean(post.commentId);

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

      if (userReaction !== emotion) {
        celebrateReaction(emotion);
      }
      notifyReaction?.(userReaction === emotion ? 'removed' : 'added', emotion);
      pickEmotion(emotion).catch(() => undefined);
    },
    [
      celebrateReaction,
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
      ref={postRef}
      twClassName={
        post.isPending
          ? 'overflow-visible py-2 opacity-60'
          : 'overflow-visible py-2'
      }
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

        {/* 8px before this group. The translation line keeps about 4px under
            its letters, so the space above the card reads near 12px. */}
        <Box twClassName="mt-2 gap-3">
          {onPositionPress ? (
            <Pressable
              accessibilityRole="button"
              onPress={handlePositionPress}
              testID={`${SocialFeedPostShellSelectorsIDs.POSITION_PRESS}-${post.id}`}
            >
              <PositionCardBody
                item={post.item}
                onCopyTrade={copyTradeHandler}
                showCopyTrade={showCopyTrade}
              />
            </Pressable>
          ) : (
            <PositionCardBody
              item={post.item}
              onCopyTrade={copyTradeHandler}
              showCopyTrade={showCopyTrade}
            />
          )}

          {post.gifUri ? (
            <Box twClassName="rounded-2xl overflow-hidden">
              <SocialFeedGif
                uri={post.gifUri}
                testID={`${SocialFeedPostShellSelectorsIDs.GIF}-${post.id}`}
              />
            </Box>
          ) : null}

          <SocialFeedPostFooter
            postId={post.id}
            canReact={canReact}
            copyCount={post.copyCount}
            chips={chips}
            userReaction={userReaction}
            burst={burst}
            onToggleEmotion={toggleEmotion}
            onBurstAnchor={placeBurst}
            onOpenPicker={openPicker}
            reactionAnchorRef={reactionAnchorRef}
            emojiColor={colors.icon.alternative}
          />
        </Box>
      </SocialTraderIdentityRow>

      {canReact ? (
        <ReactionPickerBalloon
          visible={pickerVisible}
          anchor={pickerAnchor}
          onClose={closePicker}
          onPick={handlePick}
        />
      ) : null}
      {optionsSheet}
      {geoBlockSheet}
      {burst?.x != null && burst.y != null ? (
        <ReactionEmojiBurst
          key={burst.key}
          burstKey={burst.key}
          emotion={burst.emotion}
          originX={burst.x}
          originY={burst.y}
          onFinished={clearBurst}
        />
      ) : null}
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

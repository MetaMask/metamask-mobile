import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonBase,
  ButtonBaseSize,
  FontFamily,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, {
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, View } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import EmojiAddIcon from '../../../../images/emoji-add.svg';
import AnimatedNumericText from '../../../../component-library/components-temp/AnimatedNumericText/AnimatedNumericText';
import { getHardwareTier } from '../../../../util/deviceCapability';
import {
  ImpactMoment,
  playImpact,
  playSelection,
} from '../../../../util/haptics';
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
import { SocialFeedWindowOffsetContext } from './SocialFeedWindowOffsetContext';
import { useSocialFeedTracking } from '../socialFeedTracking';
import { useSocialFeedSurface } from '../SocialFeedSurface';
import {
  socialFeedPostAnalytics,
  socialFeedPostSubject,
} from '../utils/socialPositionAnalytics';
import {
  SocialEvent,
  type SocialBlockedReason,
  type SocialCopyTradeAnalyticsProperties,
  type SocialPositionAnalyticsProperties,
} from '../../../Views/SocialLeaderboard/analytics/socialEvents';
import { SocialFeedPostShellSelectorsIDs } from './SocialFeedPostShell.testIds';

export interface SocialFeedPostShellProps {
  post: SocialV1FeedPost;
  onCopyTrade?: (item: SocialV1FeedPost['item'], commentId?: string) => void;
  onCopyTradeInteraction?: (
    position: SocialCopyTradeAnalyticsProperties,
  ) => void;
  onReactionInteraction?: (
    action: 'added' | 'removed',
    emotion: string,
    subject?: { post_id?: string; author_trader_id?: string },
  ) => void;
  onReactionPickerOpened?: () => void;
  onAuthorPress?: (post: SocialV1FeedPost) => void;
  /** Opens the position details. The card's own buttons keep their press. */
  onPositionPress?: (post: SocialV1FeedPost) => void;
  /**
   * Set `false` to hide Copy trade on an open card. The owner's profile posts
   * pass this so they cannot copy their own trade.
   */
  showCopyTrade?: boolean;
  /**
   * When false, the attached GIF keeps its frame and drops the decoded image.
   * Virtualized rows pass this from list viewability. Defaults to visible.
   */
  gifVisible?: boolean;
}

interface ShellCopyTradeTracking {
  postAnalytics: SocialPositionAnalyticsProperties;
  notifyCopy?: (position: SocialCopyTradeAnalyticsProperties) => void;
  notifyBlocked?: (
    position: SocialPositionAnalyticsProperties,
    reason: SocialBlockedReason,
  ) => void;
}

const useShellCopyTrade = (
  post: SocialV1FeedPost,
  onSpotCopyTrade: SocialFeedPostShellProps['onCopyTrade'],
  { postAnalytics, notifyCopy, notifyBlocked }: ShellCopyTradeTracking,
  getCopyTradeBlockedReason: (
    onAccepted?: () => void,
  ) => SocialBlockedReason | null,
) => {
  const { onCopyTrade: onPerpsCopyTrade, geoBlockSheet } = useCopyTradeToPerps(
    post.item,
    post.commentId,
  );
  const allowCopyTrade = useCallback(
    (onAccepted?: () => void) => {
      const blockedReason = getCopyTradeBlockedReason(onAccepted);
      if (blockedReason) {
        notifyBlocked?.(postAnalytics, blockedReason);
        return false;
      }
      notifyCopy?.({ ...postAnalytics, ...socialFeedPostSubject(post) });
      return true;
    },
    [getCopyTradeBlockedReason, notifyBlocked, notifyCopy, post, postAnalytics],
  );
  // Perps opens the order sheet. Spot hands the item to the feed so QuickBuy
  // can target that token. A closed position has nothing to copy.
  const handleSpotCopyTrade = useCallback(
    function copySpot(): void {
      if (!allowCopyTrade(copySpot)) {
        return;
      }
      onSpotCopyTrade?.(post.item, post.commentId);
    },
    [allowCopyTrade, onSpotCopyTrade, post.item, post.commentId],
  );
  const handlePerpsCopyTrade = useCallback(
    function copyPerps(): void {
      if (!allowCopyTrade(copyPerps)) {
        return;
      }
      onPerpsCopyTrade?.();
    },
    [allowCopyTrade, onPerpsCopyTrade],
  );
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
  /** The chip row. The picker opens from its leading edge. */
  reactionRowRef: React.RefObject<View | null>;
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
  reactionRowRef,
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
          ref={reactionRowRef}
          collapsable={false}
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={2}
          testID={`${SocialFeedPostShellSelectorsIDs.REACTION_ROW}-${postId}`}
          className="flex-1 min-w-0 flex-wrap"
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
          <ButtonBase
            size={ButtonBaseSize.Sm}
            className={`${REACTION_PILL_TW_CLASS} border-muted w-8 px-0`}
            accessibilityLabel={strings('social_leaderboard.feed.add_reaction')}
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
          {/* Default face keeps the count's look; AnimatedNumericText defaults to Hero.
              No container glide until Reanimated 4.6+ (TSA-1725): it could
              leave the count drawn over the post's GIF. */}
          <AnimatedNumericText
            animated={getHardwareTier() !== 'LOW'}
            animateContainerLayout={false}
            color={TextColor.TextAlternative}
            fontFamily={FontFamily.Default}
            value={String(copyCount)}
            variant={TextVariant.BodySm}
          />
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
  showCopyTrade = true,
  gifVisible = true,
}) => {
  const tracked = useSocialFeedTracking();
  const { location } = useSocialFeedSurface();
  const showEngagement = location !== 'social_live';
  const notifyCopy = onCopyTradeInteraction ?? tracked.onCopyTradeInteraction;
  const notifyReaction = onReactionInteraction ?? tracked.onReactionInteraction;
  const notifyPicker = onReactionPickerOpened ?? tracked.onReactionPickerOpened;
  const tw = useTailwind();
  const { colors } = useTheme();
  const reactionRowRef = useRef<View>(null);
  const postRef = useRef<View>(null);
  const windowOffsetY = useContext(SocialFeedWindowOffsetContext);
  const [pickerVisible, setPickerVisible] = useState(false);
  const { ensureSocialProfileOnboarding } = useRequireSocialProfileOnboarding();
  const { ensureSocialTermsAccepted } = useSocialTermsGate();
  const getCopyTradeBlockedReason = useCallback(
    (onAccepted?: () => void): SocialBlockedReason | null => {
      if (!ensureSocialTermsAccepted(onAccepted)) {
        return SocialEvent.BlockedReason.TERMS;
      }
      if (!ensureSocialProfileOnboarding()) {
        return SocialEvent.BlockedReason.PROFILE_ONBOARDING;
      }
      return null;
    },
    [ensureSocialProfileOnboarding, ensureSocialTermsAccepted],
  );
  const postAnalytics = useMemo(() => socialFeedPostAnalytics(post), [post]);
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
    open: openOptions,
    sheet: optionsSheet,
    isHidden,
  } = useSocialEntryOptions(optionsTarget);
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
    {
      postAnalytics,
      notifyCopy,
      notifyBlocked: tracked.onCopyTradeBlocked,
    },
    getCopyTradeBlockedReason,
  );

  const chips = visibleReactions(reactions);
  const canReact = Boolean(post.commentId);

  const openPicker = useCallback(
    function open(): void {
      if (
        !ensureSocialTermsAccepted(open) ||
        !ensureSocialProfileOnboarding()
      ) {
        return;
      }

      reactionRowRef.current?.measureInWindow((x, y, width, height) => {
        playImpact(ImpactMoment.SecondaryCTA).catch(() => undefined);
        setPickerAnchor({ x, y: y + windowOffsetY, width, height });
        setPickerVisible(true);
        notifyPicker?.();
      });
    },
    [
      ensureSocialProfileOnboarding,
      ensureSocialTermsAccepted,
      notifyPicker,
      windowOffsetY,
    ],
  );

  const closePicker = useCallback(() => {
    setPickerVisible(false);
  }, []);

  const toggleEmotion = useCallback(
    function toggle(emotion: string, withHaptic = true): void {
      if (
        !ensureSocialTermsAccepted(() => toggle(emotion, withHaptic)) ||
        !ensureSocialProfileOnboarding() ||
        isPending
      ) {
        return;
      }

      if (userReaction !== emotion) {
        celebrateReaction(emotion);
      }
      notifyReaction?.(
        userReaction === emotion ? 'removed' : 'added',
        emotion,
        {
          ...(post.commentId ? { post_id: post.commentId } : {}),
          ...(post.item.author.id
            ? { author_trader_id: post.item.author.id }
            : {}),
        },
      );
      // The tray emoji already plays this tick before it calls onPick.
      if (withHaptic) {
        playSelection().catch(() => undefined);
      }
      pickEmotion(emotion).catch(() => undefined);
    },
    [
      celebrateReaction,
      ensureSocialProfileOnboarding,
      ensureSocialTermsAccepted,
      isPending,
      notifyReaction,
      pickEmotion,
      post.commentId,
      post.item.author.id,
      userReaction,
    ],
  );

  const handlePick = useCallback(
    (emotion: string) => {
      toggleEmotion(emotion, false);
    },
    [toggleEmotion],
  );

  const handleIdentityPress = useCallback(() => {
    tracked.onAuthorTap?.(postAnalytics);
    onAuthorPress?.(post);
  }, [onAuthorPress, post, postAnalytics, tracked]);

  const handlePositionPress = useCallback(() => {
    tracked.onPositionTap?.(postAnalytics);
    onPositionPress?.(post);
  }, [onPositionPress, post, postAnalytics, tracked]);

  if (isHidden) {
    return null;
  }

  return (
    <Box
      ref={postRef}
      className={
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
        recyclingKey={post.id}
        onMorePress={openOptions}
        onIdentityPress={onAuthorPress ? handleIdentityPress : undefined}
        testIDs={{
          avatar: `${SocialFeedPostShellSelectorsIDs.AVATAR}-${post.id}`,
          timestamp: `${SocialFeedPostShellSelectorsIDs.TIMESTAMP}-${post.id}`,
          verifiedBadge: `${SocialFeedPostShellSelectorsIDs.VERIFIED_BADGE}-${post.id}`,
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
        <Box className="mt-2 gap-3">
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
            <Box className="rounded-2xl overflow-hidden">
              <SocialFeedGif
                uri={post.gifUri}
                visible={gifVisible}
                testID={`${SocialFeedPostShellSelectorsIDs.GIF}-${post.id}`}
              />
            </Box>
          ) : null}

          {showEngagement ? (
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
              reactionRowRef={reactionRowRef}
              emojiColor={colors.icon.alternative}
            />
          ) : null}
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

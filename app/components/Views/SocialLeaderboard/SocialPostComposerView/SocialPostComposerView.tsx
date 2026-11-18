import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { Position } from '@metamask/social-controllers';
import {
  StackActions,
  useNavigation,
  useRoute,
  type NavigationState,
} from '@react-navigation/native';
import { useSelector } from 'react-redux';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  type TextStyle,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { strings } from '../../../../../locales/i18n';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { IconName as ComponentLibraryIconName } from '../../../../component-library/components/Icons/Icon';
import ReactQueryService from '../../../../core/ReactQueryService';
import Routes from '../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { popToSocialTab } from '../Onboarding/socialLeaderboardOnboardingNavigation';
import useScreenTransitionComplete from '../../../hooks/useScreenTransitionComplete';
import { useKeyboardHeight } from '../../../hooks/useKeyboardHeight/useKeyboardHeight';
import { useTheme } from '../../../../util/theme';
import { getHardwareTier } from '../../../../util/deviceCapability';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import HeaderBaseGlass from '../../../../component-library/components-temp/HeaderBaseGlass';
import { selectGlassHeadersEnabled } from '../../../../selectors/featureFlagController/glassHeaders';
import { selectIsProfileTradingActivityPrivate } from '../../../../selectors/profileController';
import {
  fireImpact,
  ImpactMoment,
  playSuccessNotification,
} from '../../../../util/haptics';
import SocialHeaderGlassSurface from '../components/SocialHeaderGlassSurface';
import ProfileAvatar from '../MyProfileView/components/ProfileAvatar';
import { useMyProfile } from '../MyProfileView/hooks';
import { SCROLLABLE_SCREEN_SAFE_AREA_EDGES } from '../shared/scrollableScreenSafeArea';
import { PositionCardBody } from '../../../UI/SocialFeed/components/SocialFeedPositionCard';
import SocialLivePricesProvider from '../../../UI/SocialFeed/live/SocialLivePricesProvider';
import { isPerpPosition } from '../../../UI/SocialFeed/utils/perp';
import { SocialFeedSurfaceProvider } from '../../../UI/SocialFeed/SocialFeedSurface';
import SocialFeedGif from '../../../UI/SocialFeed/components/SocialFeedGif';
import { invalidateModerationStatus } from '../../../UI/SocialFeed/moderationApi';
import { extractHttpStatus } from '../../../../util/social/socialServiceTelemetry';
import { addPendingPost } from '../pendingPosts/pendingPostsStore';
import type {
  SocialV1FeedAuthor,
  SocialV1FeedItem,
} from '../../../UI/SocialFeed/types';
import { appendKlipyGifUrlToCommentText } from '../../../UI/SocialFeed/utils/klipyGifComment';
import { buildPendingPost } from './buildPendingPost';
import { createSwapComment } from './createSwapCommentApi';
import { withCreateSwapCommentTimeout } from './createSwapCommentTimeout';
import { COMPOSER_COMMENT_MAX_LENGTH } from './commentValidation';
import {
  COMPOSER_FEED_AUTHOR,
  mapPositionToFeedItem,
} from './mapPositionToFeedItem';
import { mapPerpsOrderInFlightToFeedItem } from './mapPerpsOrderInFlightToFeedItem';
import { mapTradeInFlightToFeedItem } from './mapTradeInFlightToFeedItem';
import type {
  SocialPostComposerPreview,
  SocialPostComposerViewParams,
} from './SocialPostComposerView.types';
import GifPickerSheet from './GifPickerSheet';
import AddPositionBottomSheet from './AddPositionBottomSheet';
import PrivateComposerContent from './PrivateComposerContent';
import { SocialPostComposerViewSelectorsIDs } from './SocialPostComposerView.testIds';
import {
  SocialEvent,
  useSocialInteraction,
  useSocialScreenAnalytics,
} from '../analytics';
import {
  resolvePostComposerAnalyticsSource,
  resolvePostComposerEntry,
} from './resolvePostComposerAnalyticsSource';

const { Interaction, Outcome, Screen, ShareDestination, Trade } = SocialEvent;
type ComposerRoute = NavigationState['routes'][number];

const getPreviousRoute = (
  state: NavigationState | undefined,
): ComposerRoute | undefined =>
  state && state.index > 0 ? state.routes[state.index - 1] : undefined;

const TRENDING_FEED_PARAMS = { initialTab: 'trending' } as const;

/**
 * Where a published post lands: the Social V1 feed's Trending tab, where the
 * new post is pinned on top until the feed returns it.
 *
 * Opened from the V1 feed screen, it pops back to it. Opened from anywhere
 * else (the Social tab, Perps, token details, Quick Buy, a profile), it pops
 * back to the Social tab under Home, so the tab bar stays visible and the
 * posted composer is gone from the stack.
 */
const landOnTrendingFeed = (
  navigation: Pick<AppNavigationProp, 'dispatch' | 'navigate' | 'getState'>,
): void => {
  if (getPreviousRoute(navigation.getState())?.name === Routes.SOCIAL.V1) {
    navigation.dispatch(
      StackActions.popTo(Routes.SOCIAL.V1, TRENDING_FEED_PARAMS, {
        merge: true,
      }),
    );
    return;
  }
  popToSocialTab(navigation, TRENDING_FEED_PARAMS);
};

interface ImageInsertEvent {
  nativeEvent: {
    uri?: string;
    linkUri?: string;
  };
}

/** 32px disc plus 6px on each side, so the tap target meets the 44pt minimum. */
const ATTACHMENT_CLOSE_HIT_SLOP = 6;

const ComposerAttachmentCloseButton = ({
  onPress,
  accessibilityLabel,
  testID,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  testID: string;
}) => (
  // React Native draws a border inside its view, so the ring is a 36px frame
  // around the unchanged 32px disc. The offset keeps that disc where it was.
  <Box
    pointerEvents="box-none"
    twClassName="absolute z-20 -top-3.5 -right-3.5 h-9 w-9 items-center justify-center rounded-full border-2 border-background-default"
  >
    <ButtonIcon
      iconName={IconName.Close}
      size={ButtonIconSize.Md}
      iconProps={{ color: IconColor.IconDefault, size: IconSize.Md }}
      hitSlop={ATTACHMENT_CLOSE_HIT_SLOP}
      twClassName="bg-section"
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    />
  </Box>
);

interface ComposerChipProps {
  label: string;
  onPress: () => void;
  testID: string;
  icon: React.ReactNode;
  accessibilityState?: { selected?: boolean };
}

/** Outline pill shared by the Position and GIF actions, matching the header height. */
const ComposerChip = ({
  label,
  onPress,
  testID,
  icon,
  accessibilityState,
}: ComposerChipProps) => {
  const tw = useTailwind();

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      style={tw.style(
        'h-10 flex-row items-center gap-1 rounded-full border border-muted px-3',
      )}
    >
      {icon}
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {label}
      </Text>
    </Pressable>
  );
};

// The caption lives outside React state so typing only re-renders the
// subscribers, not the whole screen (the header and the ticking preview both
// read it). Selectors must return primitives — a fresh object or array fails
// the snapshot check and re-renders on every keystroke.
const createComposerTextStore = () => {
  let text = '';
  const listeners = new Set<() => void>();
  return {
    get: () => text,
    set: (next: string) => {
      if (next === text) {
        return;
      }
      text = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};
type ComposerTextStore = ReturnType<typeof createComposerTextStore>;

const useComposerText = <T,>(
  store: ComposerTextStore,
  select: (text: string) => T,
): T => useSyncExternalStore(store.subscribe, () => select(store.get()));

const ComposerTextInput = ({
  store,
  inputRef,
  onImageChange,
}: {
  store: ComposerTextStore;
  inputRef: React.RefObject<TextInput | null>;
  onImageChange: (event: ImageInsertEvent) => void;
}) => {
  const tw = useTailwind();
  const { colors, typography } = useTheme();
  const text = useComposerText(store, (value) => value);
  const inputTypography = useMemo<TextStyle>(
    () => ({
      fontSize: typography.lBodyMD.fontSize,
      lineHeight: typography.lBodyMD.lineHeight,
      letterSpacing: typography.lBodyMD.letterSpacing,
      fontWeight: typography.lBodyMD.fontWeight as TextStyle['fontWeight'],
    }),
    [typography.lBodyMD],
  );

  return (
    <TextInput
      ref={inputRef}
      value={text}
      onChangeText={store.set}
      placeholder={strings('social_leaderboard.composer.placeholder')}
      placeholderTextColor={colors.text.alternative}
      multiline
      showSoftInputOnFocus
      style={[tw.style('w-full text-default p-0'), inputTypography]}
      testID={SocialPostComposerViewSelectorsIDs.INPUT}
      {...{ onImageChange }}
    />
  );
};

const TABULAR_NUMS_STYLE: TextStyle = { fontVariant: ['tabular-nums'] };

// HeaderBase re-renders when its end accessory's width changes, so use
// equal-width digits to keep the count's width stable while typing.
const ComposerCharacterCount = ({ store }: { store: ComposerTextStore }) => {
  const count = useComposerText(store, (value) => value.length);

  return (
    <Text
      variant={TextVariant.BodySm}
      color={
        count > COMPOSER_COMMENT_MAX_LENGTH
          ? TextColor.ErrorDefault
          : TextColor.TextAlternative
      }
      style={TABULAR_NUMS_STYLE}
      testID={SocialPostComposerViewSelectorsIDs.CHARACTER_COUNT}
    >
      {strings('social_leaderboard.composer.character_count', {
        count,
        limit: COMPOSER_COMMENT_MAX_LENGTH,
      })}
    </Text>
  );
};

const ComposerPostButton = ({
  store,
  hasTarget,
  isSubmitting,
  onPress,
}: {
  store: ComposerTextStore;
  hasTarget: boolean;
  isSubmitting: boolean;
  onPress: () => void;
}) => {
  const hasPostableText = useComposerText(
    store,
    (value) =>
      value.trim().length > 0 && value.length <= COMPOSER_COMMENT_MAX_LENGTH,
  );

  return (
    <Button
      variant={ButtonVariant.Primary}
      size={ButtonSize.Md}
      isDisabled={!hasTarget || !hasPostableText || isSubmitting}
      onPress={onPress}
      testID={SocialPostComposerViewSelectorsIDs.POST_BUTTON}
    >
      {isSubmitting
        ? strings('social_leaderboard.composer.posting')
        : strings('social_leaderboard.composer.post')}
    </Button>
  );
};

interface ComposerPreviewProps {
  selectedPosition: { position: Position; isClosed: boolean } | null;
  tradeInFlightPreview: SocialPostComposerPreview | undefined;
  composerAuthor: SocialV1FeedAuthor;
  gifUri: string | null;
  isLivePreview: boolean;
  isTradeInFlightLocked: boolean;
  onRemovePosition: () => void;
}

/**
 * Preview card. The caption never shows here — PositionCardBody renders the
 * card, not the comment, and `expanded` fixes the layout — so the item maps
 * once with an empty comment and typing does not rebuild it.
 */
const ComposerPreview = ({
  selectedPosition,
  tradeInFlightPreview,
  composerAuthor,
  gifUri,
  isLivePreview,
  isTradeInFlightLocked,
  onRemovePosition,
}: ComposerPreviewProps) => {
  const previewItem: SocialV1FeedItem | null = useMemo(() => {
    if (tradeInFlightPreview) {
      if ('product' in tradeInFlightPreview) {
        return mapPerpsOrderInFlightToFeedItem(tradeInFlightPreview, '', {
          author: composerAuthor,
          commentGifUrl: gifUri ?? undefined,
        });
      }
      return mapTradeInFlightToFeedItem(tradeInFlightPreview, '', {
        author: composerAuthor,
        commentGifUrl: gifUri ?? undefined,
      });
    }
    if (!selectedPosition) {
      return null;
    }
    return mapPositionToFeedItem(selectedPosition.position, '', {
      isClosed: selectedPosition.isClosed,
      author: composerAuthor,
      commentGifUrl: gifUri ?? undefined,
      liveTicks: isLivePreview,
    });
  }, [
    composerAuthor,
    gifUri,
    isLivePreview,
    selectedPosition,
    tradeInFlightPreview,
  ]);

  if (!previewItem) {
    return null;
  }

  return (
    <Box twClassName="relative mt-12">
      {isLivePreview ? (
        <SocialLivePricesProvider>
          <PositionCardBody item={previewItem} expanded showCopyTrade={false} />
        </SocialLivePricesProvider>
      ) : (
        <PositionCardBody item={previewItem} expanded showCopyTrade={false} />
      )}
      {isTradeInFlightLocked ? null : (
        <ComposerAttachmentCloseButton
          onPress={onRemovePosition}
          accessibilityLabel={strings(
            'social_leaderboard.composer.remove_position',
          )}
          testID={SocialPostComposerViewSelectorsIDs.REMOVE_POSITION}
        />
      )}
    </Box>
  );
};

const SocialPostComposerEditor: React.FC = () => {
  const tw = useTailwind();
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute();
  const routeParams = route.params as SocialPostComposerViewParams | undefined;
  const tradeInFlightParams = routeParams?.tradeInFlight;
  const tradeInFlightPreview = routeParams?.preview;
  const routedPosition = routeParams?.position;
  const { toastRef } = useContext(ToastContext);
  const isScreenTransitionComplete = useScreenTransitionComplete();
  const { profile } = useMyProfile();
  const linkedAccountAddress = profile?.linkedAccountAddress?.trim() ?? '';
  const inputRef = useRef<TextInput>(null);
  const [textStore] = useState(createComposerTextStore);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<{
    position: Position;
    isClosed: boolean;
  } | null>(
    routedPosition
      ? { position: routedPosition, isClosed: routedPosition.isOpen === false }
      : null,
  );
  const [gifUri, setGifUri] = useState<string | null>(null);
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const [isGifSheetOpen, setIsGifSheetOpen] = useState(false);
  const analyticsSource = resolvePostComposerAnalyticsSource(routeParams);
  const composerEntry = resolvePostComposerEntry(routeParams);
  const composerAnalytics = useMemo(
    () => (composerEntry ? { composer_entry: composerEntry } : undefined),
    [composerEntry],
  );
  const trackInteraction = useSocialScreenAnalytics(Screen.POST_COMPOSER, {
    source: analyticsSource,
    properties: composerAnalytics,
  });
  const trackShareSheet = useSocialInteraction(Screen.SHARE_POSITION_SHEET, {
    source: analyticsSource,
  });
  const keyboardHeight = useKeyboardHeight();
  const isKeyboardVisible = keyboardHeight > 0;
  // iOS KeyboardAvoidingView already lifts this bar. Android edge-to-edge
  // does not resize the window, so the bar has to clear the keyboard itself.
  const actionBarPaddingBottom =
    Platform.OS === 'android' && keyboardHeight > 0
      ? keyboardHeight + Math.max(insets.bottom, 12)
      : Math.max(insets.bottom, 12);
  const [hardwareTier] = useState(() => getHardwareTier());
  const networkTier = useNetworkTier();
  // UX matrix (app/util/deviceCapability/README.md): offline, and LOW hardware on
  // a slow network (less animation, rare poll), keep the preview static. Every
  // other cell stays live and the provider applies reduced motion and throttling.
  // `null` on either tier is unknown, so it never counts as LOW or offline.
  const isLivePreview =
    networkTier !== 'NONE' &&
    !(hardwareTier === 'LOW' && networkTier === 'SLOW_CELLULAR');

  const authorName = profile?.displayName || profile?.handle || '';
  const composerAuthor = useMemo(
    () => ({
      id: profile?.profileId ?? COMPOSER_FEED_AUTHOR.id,
      username: authorName,
      avatarUri: profile?.imageUrl,
      winRatePercent: COMPOSER_FEED_AUTHOR.winRatePercent,
    }),
    [authorName, profile?.imageUrl, profile?.profileId],
  );

  // The preview maps itself inside ComposerPreview, so the analytics trade
  // type is derived from the raw inputs here.
  const analyticsTradeType = tradeInFlightPreview
    ? 'product' in tradeInFlightPreview
      ? Trade.PERPS
      : Trade.SPOT
    : selectedPosition
      ? isPerpPosition(selectedPosition.position)
        ? Trade.PERPS
        : Trade.SPOT
      : undefined;

  const isTradeInFlightLocked = tradeInFlightParams != null;
  const hasTarget = selectedPosition != null || isTradeInFlightLocked;

  const handleClose = useCallback(() => {
    trackInteraction(Interaction.BUTTON_CLICKED, Outcome.DISMISSED);
    navigation.goBack();
  }, [navigation, trackInteraction]);

  const handleSelectPosition = useCallback(
    (position: Position, isClosed: boolean) => {
      setSelectedPosition({ position, isClosed });
      setIsShareSheetOpen(false);
    },
    [],
  );

  const handleImageInsert = useCallback((event: ImageInsertEvent) => {
    const uri = event.nativeEvent.uri ?? event.nativeEvent.linkUri;
    if (uri) {
      setGifUri(uri);
    }
  }, []);

  const handleRemovePosition = useCallback(() => setSelectedPosition(null), []);

  const focusComposer = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handleGifChipPress = useCallback(() => {
    setIsShareSheetOpen(false);
    const next = !isGifSheetOpen;
    setIsGifSheetOpen(next);
    if (next) {
      Keyboard.dismiss();
      trackInteraction(Interaction.GIF_PICKER_OPENED);
    }
  }, [isGifSheetOpen, trackInteraction]);

  const handlePositionChipPress = useCallback(() => {
    setIsGifSheetOpen(false);
    setIsShareSheetOpen(true);
    trackShareSheet(Interaction.SHEET_DISPLAYED);
  }, [trackShareSheet]);

  const handleSelectGif = useCallback((nextGifUri: string) => {
    setGifUri(nextGifUri);
    setIsGifSheetOpen(false);
  }, []);

  useEffect(() => {
    // Swap-share opens this screen with `tradeInFlight` and never goes
    // through `useOpenSocialPostComposer`. Do not bounce that path — posting
    // does not need the position picker or a linked onboarding address.
    if (!linkedAccountAddress && !tradeInFlightParams) {
      navigation.goBack();
    }
  }, [linkedAccountAddress, navigation, tradeInFlightParams]);

  // Focusing mid-transition drops the keyboard on the native stack push, so
  // wait until the screen has settled before raising it.
  useEffect(() => {
    if (!isScreenTransitionComplete) {
      return;
    }
    focusComposer();
  }, [isScreenTransitionComplete, focusComposer]);

  const handlePost = useCallback(async () => {
    const rawText = textStore.get();
    const caption = rawText.trim();
    if (
      (!selectedPosition && !tradeInFlightParams) ||
      rawText.length > COMPOSER_COMMENT_MAX_LENGTH ||
      caption.length === 0 ||
      isSubmitting
    ) {
      return;
    }
    const commentText = appendKlipyGifUrlToCommentText(caption, gifUri);
    const postContent = { has_gif: Boolean(gifUri) };
    fireImpact(ImpactMoment.PrimaryCTA);
    setIsSubmitting(true);
    try {
      let created;
      if (tradeInFlightParams) {
        created = await withCreateSwapCommentTimeout(
          createSwapComment({
            commentText,
            tradeInFlight: tradeInFlightParams,
            source: 'metamask-mobile',
          }),
        );
      } else if (selectedPosition) {
        created = await withCreateSwapCommentTimeout(
          createSwapComment({
            commentText,
            positionUid: selectedPosition.position.positionId,
            source: 'metamask-mobile',
          }),
        );
      } else {
        return;
      }
      playSuccessNotification().catch(() => undefined);
      const comment = created;
      const pendingPost = buildPendingPost(
        comment,
        () => {
          const name = comment.author.name || authorName;
          const avatarUri = comment.author.images?.sm ?? profile?.imageUrl;
          const author = {
            id: comment.author.id,
            username: name,
            avatarUri,
            winRatePercent: null,
          };
          const timestampMs = comment.timestamp * 1000;
          let item: SocialV1FeedItem;
          if (tradeInFlightPreview) {
            item =
              'product' in tradeInFlightPreview
                ? mapPerpsOrderInFlightToFeedItem(
                    tradeInFlightPreview,
                    caption,
                    {
                      author,
                      timestamp: timestampMs,
                      commentGifUrl: gifUri ?? undefined,
                    },
                  )
                : mapTradeInFlightToFeedItem(tradeInFlightPreview, caption, {
                    author,
                    timestamp: timestampMs,
                    commentGifUrl: gifUri ?? undefined,
                  });
          } else if (selectedPosition) {
            item = mapPositionToFeedItem(selectedPosition.position, caption, {
              isClosed: selectedPosition.isClosed,
              author,
              commentGifUrl: gifUri ?? undefined,
            });
          } else {
            return null;
          }
          return {
            id: comment.uid,
            authorHandle: name,
            authorImageUrl: avatarUri,
            timestampMs,
            reactions: [],
            gifUri: gifUri ?? undefined,
            item,
            position: tradeInFlightParams
              ? undefined
              : selectedPosition?.position,
          };
        },
        { isTradeInFlight: tradeInFlightParams != null },
      );
      if (pendingPost && profile?.profileId) {
        addPendingPost({
          ownerProfileId: profile.profileId,
          post: pendingPost,
        });
      } else if (tradeInFlightParams) {
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          iconName: ComponentLibraryIconName.Confirmation,
          iconColor: colors.success.default,
          labelOptions: [
            {
              label: strings('social_leaderboard.composer.post_pending_index'),
            },
          ],
          hasNoTimeout: false,
        });
      }
      await Promise.all([
        ReactQueryService.queryClient.invalidateQueries({
          queryKey: ['SocialService:fetchFeed'],
        }),
        ReactQueryService.queryClient.invalidateQueries({
          queryKey: ['SocialService:fetchTraderFeed'],
        }),
      ]);
      trackInteraction(Interaction.POST_SUBMITTED, {
        outcome: Outcome.SUCCESS,
        ...(analyticsTradeType ? { trade_type: analyticsTradeType } : {}),
        ...postContent,
      });
      trackInteraction(Interaction.POST_SHARED, {
        share_destination: ShareDestination.METAMASK_POST,
        ...(analyticsTradeType ? { trade_type: analyticsTradeType } : {}),
      });
      landOnTrendingFeed(navigation);
    } catch (error) {
      // The social API refuses a banned author's post with a 403, the same
      // status as a wallet they don't own; the status tells the two apart.
      if (extractHttpStatus(error) === 403) {
        invalidateModerationStatus().catch(() => undefined);
      }
      trackInteraction(Interaction.POST_FAILED, {
        outcome: Outcome.FAILED,
        ...(analyticsTradeType ? { trade_type: analyticsTradeType } : {}),
        ...postContent,
      });
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: ComponentLibraryIconName.Danger,
        iconColor: colors.error.default,
        labelOptions: [
          { label: strings('social_leaderboard.composer.post_failed') },
        ],
        hasNoTimeout: false,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    authorName,
    analyticsTradeType,
    colors.error.default,
    colors.success.default,
    gifUri,
    isSubmitting,
    navigation,
    profile?.imageUrl,
    profile?.profileId,
    selectedPosition,
    textStore,
    trackInteraction,
    toastRef,
    tradeInFlightParams,
    tradeInFlightPreview,
  ]);

  return (
    <SocialFeedSurfaceProvider location="social_post_composer" showMockedFields>
      <SafeAreaView
        edges={SCROLLABLE_SCREEN_SAFE_AREA_EDGES}
        style={tw.style('flex-1 bg-default')}
        testID={SocialPostComposerViewSelectorsIDs.CONTAINER}
      >
        <HeaderBaseGlass
          isGlass={isGlassHeader}
          isFloating={false}
          includesTopInset
          twClassName="px-4"
          startAccessory={
            <SocialHeaderGlassSurface twClassName="w-10 justify-center">
              <ButtonIcon
                iconName={IconName.Close}
                size={ButtonIconSize.Md}
                onPress={handleClose}
                testID={SocialPostComposerViewSelectorsIDs.CLOSE_BUTTON}
                accessibilityLabel={strings(
                  'social_leaderboard.composer.close',
                )}
              />
            </SocialHeaderGlassSurface>
          }
          endAccessory={
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={3}
            >
              <ComposerCharacterCount store={textStore} />
              <ComposerPostButton
                store={textStore}
                hasTarget={hasTarget}
                isSubmitting={isSubmitting}
                onPress={handlePost}
              />
            </Box>
          }
          testID={SocialPostComposerViewSelectorsIDs.HEADER}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={tw.style('flex-1')}
        >
          <ScrollView
            style={tw.style('flex-1')}
            contentContainerStyle={tw.style('px-4 pt-6 pb-4 grow')}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === 'ios' ? 'interactive' : 'on-drag'
            }
            testID={SocialPostComposerViewSelectorsIDs.SCROLL}
          >
            <Box gap={3} twClassName="w-full">
              <ProfileAvatar
                imageUrl={profile?.imageUrl}
                avatarPresetId={profile?.avatarPresetId}
                avatarBackgroundId={profile?.avatarBackgroundId}
                size="sm"
              />
              <ComposerTextInput
                store={textStore}
                inputRef={inputRef}
                onImageChange={handleImageInsert}
              />
            </Box>

            <ComposerPreview
              selectedPosition={selectedPosition}
              tradeInFlightPreview={tradeInFlightPreview}
              composerAuthor={composerAuthor}
              gifUri={gifUri}
              isLivePreview={isLivePreview}
              isTradeInFlightLocked={isTradeInFlightLocked}
              onRemovePosition={handleRemovePosition}
            />

            {gifUri ? (
              <Box twClassName="relative mt-4">
                <Box twClassName="overflow-hidden rounded-2xl">
                  <SocialFeedGif
                    uri={gifUri}
                    testID={SocialPostComposerViewSelectorsIDs.GIF_PREVIEW}
                  />
                </Box>
                <ComposerAttachmentCloseButton
                  onPress={() => setGifUri(null)}
                  accessibilityLabel={strings(
                    'social_leaderboard.composer.remove_gif',
                  )}
                  testID={SocialPostComposerViewSelectorsIDs.REMOVE_GIF}
                />
              </Box>
            ) : null}

            <Pressable
              accessible={false}
              onPress={Keyboard.dismiss}
              style={tw.style('grow')}
              testID={
                SocialPostComposerViewSelectorsIDs.DISMISS_KEYBOARD_SURFACE
              }
            />
          </ScrollView>

          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
            twClassName="px-4 pt-3"
            style={tw.style({
              paddingBottom: actionBarPaddingBottom,
            })}
            testID={SocialPostComposerViewSelectorsIDs.ACTION_BAR}
          >
            {selectedPosition || isTradeInFlightLocked ? null : (
              <ComposerChip
                label={strings('social_leaderboard.composer.chip_position')}
                icon={<Icon name={IconName.Add} size={IconSize.Md} />}
                onPress={handlePositionChipPress}
                testID={SocialPostComposerViewSelectorsIDs.POSITION_CHIP}
              />
            )}
            {gifUri ? null : (
              <ComposerChip
                label={strings('social_leaderboard.composer.chip_gif')}
                icon={<Icon name={IconName.Add} size={IconSize.Md} />}
                onPress={handleGifChipPress}
                accessibilityState={{ selected: isGifSheetOpen }}
                testID={SocialPostComposerViewSelectorsIDs.GIF_CHIP}
              />
            )}
            {isKeyboardVisible ? (
              <Box twClassName="ml-auto">
                <ButtonIcon
                  iconName={IconName.ArrowDown}
                  size={ButtonIconSize.Md}
                  onPress={Keyboard.dismiss}
                  accessibilityLabel={strings(
                    'social_leaderboard.composer.hide_keyboard',
                  )}
                  testID={SocialPostComposerViewSelectorsIDs.HIDE_KEYBOARD}
                />
              </Box>
            ) : null}
          </Box>
        </KeyboardAvoidingView>

        {isGifSheetOpen ? (
          <GifPickerSheet
            onSelect={handleSelectGif}
            onClose={() => setIsGifSheetOpen(false)}
          />
        ) : null}

        {isShareSheetOpen ? (
          <AddPositionBottomSheet
            address={linkedAccountAddress}
            onSelect={handleSelectPosition}
            onClose={() => setIsShareSheetOpen(false)}
          />
        ) : null}
      </SafeAreaView>
    </SocialFeedSurfaceProvider>
  );
};

const SocialPostComposerView: React.FC = () => {
  const isPrivate = useSelector(selectIsProfileTradingActivityPrivate);
  return isPrivate ? <PrivateComposerContent /> : <SocialPostComposerEditor />;
};

export default SocialPostComposerView;

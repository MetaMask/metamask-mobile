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
  HeaderBase,
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
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
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
import useScreenTransitionComplete from '../../../hooks/useScreenTransitionComplete';
import { useKeyboardHeight } from '../../../hooks/useKeyboardHeight/useKeyboardHeight';
import { useTheme } from '../../../../util/theme';
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
import { SocialFeedSurfaceProvider } from '../../../UI/SocialFeed/SocialFeedSurface';
import SocialFeedGif from '../../../UI/SocialFeed/components/SocialFeedGif';
import {
  addPendingPost,
  requestPostsTabFocus,
} from '../pendingPosts/pendingPostsStore';
import type { SocialV1FeedItem } from '../../../UI/SocialFeed/types';
import { appendKlipyGifUrlToCommentText } from '../../../UI/SocialFeed/utils/klipyGifComment';
import { buildPendingPost } from './buildPendingPost';
import { createSwapComment } from './createSwapCommentApi';
import {
  clipComposerComment,
  COMPOSER_COMMENT_MAX_LENGTH,
} from './commentValidation';
import {
  COMPOSER_FEED_AUTHOR,
  mapPositionToFeedItem,
} from './mapPositionToFeedItem';
import { mapPerpsOrderInFlightToFeedItem } from './mapPerpsOrderInFlightToFeedItem';
import { mapTradeInFlightToFeedItem } from './mapTradeInFlightToFeedItem';
import type { SocialPostComposerViewParams } from './SocialPostComposerView.types';
import GifPickerSheet from './GifPickerSheet';
import AddPositionBottomSheet from './AddPositionBottomSheet';
import { SocialPostComposerViewSelectorsIDs } from './SocialPostComposerView.testIds';
import {
  SocialEvent,
  useSocialInteraction,
  useSocialScreenAnalytics,
  type SocialEventSource,
} from '../analytics';

const { Interaction, Outcome, Screen, Source, Trade } = SocialEvent;
type ComposerRoute = NavigationState['routes'][number];

const getPreviousRoute = (
  state: NavigationState | undefined,
): ComposerRoute | undefined =>
  state && state.index > 0 ? state.routes[state.index - 1] : undefined;

/**
 * The viewer's own profile on either profile route, matched the same way
 * `MyProfileView` decides ownership: no trader, or the viewer's own id or
 * linked address.
 */
const isOwnProfileRoute = (
  route: ComposerRoute | undefined,
  viewer: { profileId?: string; linkedAccountAddress?: string | null },
): boolean => {
  if (
    route?.name !== Routes.SOCIAL.MY_PROFILE &&
    route?.name !== Routes.SOCIAL.V1_PROFILE
  ) {
    return false;
  }
  const params = route.params as
    | { traderId?: string; traderAddress?: string }
    | undefined;
  if (!params?.traderId) {
    return true;
  }
  return (
    params.traderId === viewer.profileId ||
    Boolean(
      params.traderAddress &&
        viewer.linkedAccountAddress &&
        params.traderAddress.toLowerCase() ===
          viewer.linkedAccountAddress.toLowerCase(),
    )
  );
};

interface ImageInsertEvent {
  nativeEvent: {
    uri?: string;
    linkUri?: string;
  };
}

const ComposerAttachmentCloseButton = ({
  onPress,
  accessibilityLabel,
  testID,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  testID: string;
}) => (
  <ButtonIcon
    iconName={IconName.Close}
    size={ButtonIconSize.Md}
    iconProps={{ color: IconColor.IconDefault }}
    twClassName="absolute z-20 -top-3 -right-3 bg-section"
    onPress={onPress}
    accessibilityLabel={accessibilityLabel}
    testID={testID}
  />
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

const SocialPostComposerView: React.FC = () => {
  const tw = useTailwind();
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const routeParams = route.params as SocialPostComposerViewParams | undefined;
  const tradeInFlightParams = routeParams?.tradeInFlight;
  const tradeInFlightPreview = routeParams?.preview;
  const routedPosition = routeParams?.position;
  const openFeedAfterPost = routeParams?.openFeedAfterPost === true;
  const { toastRef } = useContext(ToastContext);
  const isScreenTransitionComplete = useScreenTransitionComplete();
  const { profile } = useMyProfile();
  const linkedAccountAddress = profile?.linkedAccountAddress?.trim() ?? '';
  const inputRef = useRef<TextInput>(null);
  const [text, setText] = useState('');
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
  const analyticsSource: SocialEventSource | undefined =
    routeParams?.entryPoint === 'perps'
      ? Source.PERP_ASSET_SCREEN
      : routeParams?.entryPoint === 'token_details'
        ? Source.ASSET_DETAILS
        : tradeInFlightParams
          ? Source.TRADER_FEED
          : undefined;
  const trackInteraction = useSocialScreenAnalytics(Screen.POST_COMPOSER, {
    source: analyticsSource,
  });
  const trackShareSheet = useSocialInteraction(Screen.SHARE_POSITION_SHEET, {
    source: analyticsSource,
  });
  const isKeyboardVisible = useKeyboardHeight() > 0;

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

  const previewItem: SocialV1FeedItem | null = useMemo(() => {
    if (tradeInFlightPreview) {
      if ('product' in tradeInFlightPreview) {
        return mapPerpsOrderInFlightToFeedItem(
          tradeInFlightPreview,
          text.trim(),
          { author: composerAuthor },
        );
      }
      return mapTradeInFlightToFeedItem(tradeInFlightPreview, text.trim(), {
        author: composerAuthor,
      });
    }
    if (!selectedPosition) {
      return null;
    }
    return mapPositionToFeedItem(selectedPosition.position, text.trim(), {
      isClosed: selectedPosition.isClosed,
      author: composerAuthor,
    });
  }, [composerAuthor, selectedPosition, text, tradeInFlightPreview]);
  const analyticsTradeType = previewItem
    ? previewItem.variant.startsWith('perps')
      ? Trade.PERPS
      : Trade.SPOT
    : undefined;

  const isTradeInFlightLocked = tradeInFlightParams != null;
  const canSubmit = selectedPosition != null || isTradeInFlightLocked;

  const handleClose = useCallback(() => {
    trackInteraction(Interaction.BUTTON_CLICKED, Outcome.DISMISSED);
    navigation.goBack();
  }, [navigation, trackInteraction]);

  const handleChangeText = useCallback((next: string) => {
    setText(clipComposerComment(next));
  }, []);

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

  const composerInputTypography = useMemo<TextStyle>(
    () => ({
      fontSize: typography.lBodyMD.fontSize,
      lineHeight: typography.lBodyMD.lineHeight,
      letterSpacing: typography.lBodyMD.letterSpacing,
      fontWeight: typography.lBodyMD.fontWeight as TextStyle['fontWeight'],
    }),
    [typography.lBodyMD],
  );

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
    if (
      (!selectedPosition && !tradeInFlightParams) ||
      !canSubmit ||
      isSubmitting
    ) {
      return;
    }
    const caption = text.trim();
    const commentText = appendKlipyGifUrlToCommentText(caption, gifUri);
    fireImpact(ImpactMoment.PrimaryCTA);
    setIsSubmitting(true);
    try {
      let created;
      if (tradeInFlightParams) {
        created = await createSwapComment({
          commentText,
          tradeInFlight: tradeInFlightParams,
          source: 'metamask-mobile',
        });
      } else if (selectedPosition) {
        created = await createSwapComment({
          commentText,
          positionUid: selectedPosition.position.positionId,
          source: 'metamask-mobile',
        });
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
                    { author, timestamp: timestampMs },
                  )
                : mapTradeInFlightToFeedItem(tradeInFlightPreview, caption, {
                    author,
                    timestamp: timestampMs,
                  });
          } else if (selectedPosition) {
            item = mapPositionToFeedItem(selectedPosition.position, caption, {
              isClosed: selectedPosition.isClosed,
              author,
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
      });
      if (openFeedAfterPost) {
        // Replace so Back from the feed skips this already-posted composer.
        navigation.dispatch(StackActions.replace(Routes.SOCIAL.V1));
        return;
      }
      // Every other post lands on the viewer's Posts tab, where it is pinned.
      requestPostsTabFocus();
      if (
        isOwnProfileRoute(getPreviousRoute(navigation.getState()), {
          profileId: profile?.profileId,
          linkedAccountAddress,
        })
      ) {
        navigation.goBack();
      } else {
        // Replace so Back from the profile skips this already-posted composer.
        navigation.dispatch(StackActions.replace(Routes.SOCIAL.V1_PROFILE));
      }
    } catch {
      trackInteraction(Interaction.POST_FAILED, {
        outcome: Outcome.FAILED,
        ...(analyticsTradeType ? { trade_type: analyticsTradeType } : {}),
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
    canSubmit,
    colors.error.default,
    colors.success.default,
    gifUri,
    isSubmitting,
    linkedAccountAddress,
    navigation,
    openFeedAfterPost,
    profile?.imageUrl,
    profile?.profileId,
    selectedPosition,
    text,
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
        <HeaderBase
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
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                testID={SocialPostComposerViewSelectorsIDs.CHARACTER_COUNT}
              >
                {strings('social_leaderboard.composer.character_count', {
                  count: text.length,
                  limit: COMPOSER_COMMENT_MAX_LENGTH,
                })}
              </Text>
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Sm}
                isDisabled={!canSubmit || isSubmitting}
                onPress={handlePost}
                testID={SocialPostComposerViewSelectorsIDs.POST_BUTTON}
              >
                {isSubmitting
                  ? strings('social_leaderboard.composer.posting')
                  : strings('social_leaderboard.composer.post')}
              </Button>
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
              <TextInput
                ref={inputRef}
                value={text}
                onChangeText={handleChangeText}
                placeholder={strings('social_leaderboard.composer.placeholder')}
                placeholderTextColor={colors.text.alternative}
                multiline
                showSoftInputOnFocus
                style={[
                  tw.style('w-full text-default p-0'),
                  composerInputTypography,
                ]}
                testID={SocialPostComposerViewSelectorsIDs.INPUT}
                {...{
                  onImageChange: handleImageInsert,
                }}
              />
            </Box>

            {previewItem ? (
              <Box twClassName="relative mt-12">
                <PositionCardBody item={previewItem} />
                {isTradeInFlightLocked ? null : (
                  <ComposerAttachmentCloseButton
                    onPress={() => setSelectedPosition(null)}
                    accessibilityLabel={strings(
                      'social_leaderboard.composer.remove_position',
                    )}
                    testID={SocialPostComposerViewSelectorsIDs.REMOVE_POSITION}
                  />
                )}
              </Box>
            ) : null}

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
              paddingBottom: Math.max(insets.bottom, 12),
            })}
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

export default SocialPostComposerView;

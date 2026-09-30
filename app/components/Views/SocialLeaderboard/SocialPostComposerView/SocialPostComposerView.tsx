import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  HeaderBase,
  Icon,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { Position } from '@metamask/social-controllers';
import { useNavigation } from '@react-navigation/native';
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
import Svg, { Circle, Path } from 'react-native-svg';
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
import useScreenTransitionComplete from '../../../hooks/useScreenTransitionComplete';
import { useTheme } from '../../../../util/theme';
import SocialHeaderGlassSurface from '../components/SocialHeaderGlassSurface';
import ProfileAvatar from '../MyProfileView/components/ProfileAvatar';
import { useMyProfile } from '../MyProfileView/hooks';
import { SCROLLABLE_SCREEN_SAFE_AREA_EDGES } from '../shared/scrollableScreenSafeArea';
import { PositionCardBody } from '../SocialV1View/feed/components/SocialFeedPositionCard';
import { submitSocialV1ComposedPost } from '../SocialV1View/feed/store/socialV1ComposedFeedStore';
import type { SocialV1FeedItem } from '../SocialV1View/feed/types';
import { appendKlipyGifUrlToCommentText } from '../utils/klipyGifComment';
import { createSwapComment } from './createSwapCommentApi';
import {
  clipComposerComment,
  COMPOSER_COMMENT_MAX_LENGTH,
} from './commentValidation';
import {
  COMPOSER_FEED_AUTHOR,
  mapPositionToFeedItem,
} from './mapPositionToFeedItem';
import GifPickerSheet from './GifPickerSheet';
import SharePositionBottomSheet from './SharePositionBottomSheet';
import { SocialPostComposerViewSelectorsIDs } from './SocialPostComposerView.testIds';

interface ImageInsertEvent {
  nativeEvent: {
    uri?: string;
    linkUri?: string;
  };
}

/** Line smiley matching the composer GIF chip; the icon set has no equivalent. */
const GifChipIcon = ({ color }: { color: string }) => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Circle cx="8" cy="8" r="6.25" stroke={color} strokeWidth={1.25} />
    <Circle cx="6" cy="6.75" r="0.75" fill={color} />
    <Circle cx="10" cy="6.75" r="0.75" fill={color} />
    <Path
      d="M5.5 9.25c.55.85 1.45 1.3 2.5 1.3s1.95-.45 2.5-1.3"
      stroke={color}
      strokeWidth={1.25}
      strokeLinecap="round"
    />
  </Svg>
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
        'h-10 flex-row items-center gap-2 rounded-full border border-muted px-4',
      )}
    >
      {icon}
      <Text variant={TextVariant.BodyMd}>{label}</Text>
    </Pressable>
  );
};

const SocialPostComposerView: React.FC = () => {
  const tw = useTailwind();
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { toastRef } = useContext(ToastContext);
  const isScreenTransitionComplete = useScreenTransitionComplete();
  const { profile } = useMyProfile();
  const inputRef = useRef<TextInput>(null);
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<{
    position: Position;
    isClosed: boolean;
  } | null>(null);
  const [gifUri, setGifUri] = useState<string | null>(null);
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const [isGifSheetOpen, setIsGifSheetOpen] = useState(false);

  const composerAuthor = useMemo(
    () => ({
      id: profile?.profileId ?? COMPOSER_FEED_AUTHOR.id,
      username: profile?.handle ?? '',
      avatarUri: profile?.imageUrl,
      winRatePercent: COMPOSER_FEED_AUTHOR.winRatePercent,
    }),
    [profile?.handle, profile?.imageUrl, profile?.profileId],
  );

  const previewItem: SocialV1FeedItem | null = useMemo(() => {
    if (!selectedPosition) {
      return null;
    }
    return mapPositionToFeedItem(selectedPosition.position, text.trim(), {
      isClosed: selectedPosition.isClosed,
      author: composerAuthor,
    });
  }, [composerAuthor, selectedPosition, text]);

  // A position is the only requirement. An empty caption still posts.
  const canSubmit = selectedPosition != null;

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

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
    setIsGifSheetOpen((open) => {
      const next = !open;
      if (next) {
        Keyboard.dismiss();
      }
      return next;
    });
  }, []);

  const handleSelectGif = useCallback((nextGifUri: string) => {
    setGifUri(nextGifUri);
    setIsGifSheetOpen(false);
  }, []);

  // Focusing mid-transition drops the keyboard on the native stack push, so
  // wait until the screen has settled before raising it.
  useEffect(() => {
    if (!isScreenTransitionComplete) {
      return;
    }
    focusComposer();
  }, [isScreenTransitionComplete, focusComposer]);

  const handlePost = useCallback(async () => {
    if (!selectedPosition || !canSubmit || isSubmitting) {
      return;
    }
    const caption = text.trim();
    const commentText = appendKlipyGifUrlToCommentText(caption, gifUri);
    setIsSubmitting(true);
    try {
      const created = await createSwapComment({
        commentText,
        positionUid: selectedPosition.position.positionId,
        source: 'metamask-mobile',
      });
      const item = mapPositionToFeedItem(selectedPosition.position, caption, {
        isClosed: selectedPosition.isClosed,
        author: composerAuthor,
      });
      submitSocialV1ComposedPost({
        id: created.uid,
        authorHandle: profile?.handle ?? '',
        authorImageUrl: profile?.imageUrl,
        timestampMs: created.timestamp * 1000,
        reactions: [],
        gifUri: gifUri ?? undefined,
        item,
      });
      await Promise.all([
        ReactQueryService.queryClient.invalidateQueries({
          queryKey: ['SocialService:fetchFeed'],
        }),
        ReactQueryService.queryClient.invalidateQueries({
          queryKey: ['SocialService:fetchTraderFeed'],
        }),
      ]);
      navigation.goBack();
    } catch {
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
    canSubmit,
    colors.error.default,
    composerAuthor,
    gifUri,
    isSubmitting,
    navigation,
    profile?.handle,
    profile?.imageUrl,
    selectedPosition,
    text,
    toastRef,
  ]);

  return (
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
              accessibilityLabel={strings('social_leaderboard.composer.close')}
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
              color={TextColor.TextMuted}
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
          contentContainerStyle={tw.style('px-4 pt-8 pb-4 gap-4')}
          keyboardShouldPersistTaps="always"
        >
          <Box gap={3} twClassName="w-full">
            <ProfileAvatar
              imageUrl={profile?.imageUrl}
              avatarPresetId={profile?.avatarPresetId}
              size="sm"
            />
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={handleChangeText}
              placeholder={strings('social_leaderboard.composer.placeholder')}
              placeholderTextColor={colors.text.alternative}
              multiline
              autoFocus={isScreenTransitionComplete}
              showSoftInputOnFocus
              style={[
                tw.style('w-full text-default min-h-24'),
                composerInputTypography,
              ]}
              testID={SocialPostComposerViewSelectorsIDs.INPUT}
              {...{
                onImageChange: handleImageInsert,
              }}
            />
          </Box>

          {previewItem ? (
            <Box twClassName="relative">
              <PositionCardBody item={previewItem} />
              <Pressable
                onPress={() => setSelectedPosition(null)}
                accessibilityRole="button"
                accessibilityLabel={strings(
                  'social_leaderboard.composer.remove_position',
                )}
                testID={SocialPostComposerViewSelectorsIDs.REMOVE_POSITION}
                hitSlop={8}
                style={tw.style(
                  'absolute z-20 -top-3 -right-3 w-8 h-8 rounded-full bg-default border border-muted items-center justify-center',
                )}
              >
                <Icon name={IconName.Close} size={IconSize.Sm} />
              </Pressable>
            </Box>
          ) : null}

          {gifUri ? (
            <Box twClassName="relative rounded-2xl overflow-hidden">
              <Image
                source={{ uri: gifUri }}
                style={tw.style('w-full aspect-square')}
                testID={SocialPostComposerViewSelectorsIDs.GIF_PREVIEW}
              />
              <Pressable
                onPress={() => setGifUri(null)}
                accessibilityRole="button"
                accessibilityLabel={strings(
                  'social_leaderboard.composer.remove_gif',
                )}
                testID={SocialPostComposerViewSelectorsIDs.REMOVE_GIF}
                style={tw.style(
                  'absolute top-2 right-2 w-7 h-7 rounded-full bg-default items-center justify-center',
                )}
              >
                <ButtonIcon
                  iconName={IconName.Close}
                  size={ButtonIconSize.Sm}
                  onPress={() => setGifUri(null)}
                />
              </Pressable>
            </Box>
          ) : null}
        </ScrollView>

        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={2}
          twClassName="px-4 pt-3"
          style={tw.style({
            paddingBottom: isGifSheetOpen ? 8 : Math.max(insets.bottom, 12),
          })}
        >
          {selectedPosition ? null : (
            <ComposerChip
              label={strings('social_leaderboard.composer.chip_position')}
              icon={<Icon name={IconName.Card} size={IconSize.Sm} />}
              onPress={() => {
                setIsGifSheetOpen(false);
                setIsShareSheetOpen(true);
              }}
              testID={SocialPostComposerViewSelectorsIDs.POSITION_CHIP}
            />
          )}
          {gifUri ? null : (
            <ComposerChip
              label={strings('social_leaderboard.composer.chip_gif')}
              icon={<GifChipIcon color={colors.icon.default} />}
              onPress={handleGifChipPress}
              accessibilityState={{ selected: isGifSheetOpen }}
              testID={SocialPostComposerViewSelectorsIDs.GIF_CHIP}
            />
          )}
        </Box>
        {isGifSheetOpen ? (
          <GifPickerSheet
            onSelect={handleSelectGif}
            onClose={() => setIsGifSheetOpen(false)}
          />
        ) : null}
      </KeyboardAvoidingView>

      {isShareSheetOpen ? (
        <SharePositionBottomSheet
          onSelect={handleSelectPosition}
          onClose={() => setIsShareSheetOpen(false)}
        />
      ) : null}
    </SafeAreaView>
  );
};

export default SocialPostComposerView;

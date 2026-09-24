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
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Image,
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
import useScreenTransitionComplete from '../../../hooks/useScreenTransitionComplete';
import { useTheme } from '../../../../util/theme';
import ProfileAvatar from '../MyProfileView/components/ProfileAvatar';
import { useMyProfile } from '../MyProfileView/hooks';
import { SCROLLABLE_SCREEN_SAFE_AREA_EDGES } from '../shared/scrollableScreenSafeArea';
import { PositionCardBody } from '../SocialV1View/feed/components/SocialFeedPositionCard';
import { submitSocialV1ComposedPost } from '../SocialV1View/feed/store/socialV1ComposedFeedStore';
import type { SocialV1FeedItem } from '../SocialV1View/feed/types';
import {
  clipComposerComment,
  COMPOSER_COMMENT_MAX_LENGTH,
  isComposerCommentValid,
} from './commentValidation';
import {
  COMPOSER_FEED_AUTHOR,
  mapPositionToFeedItem,
} from './mapPositionToFeedItem';
import SharePositionBottomSheet from './SharePositionBottomSheet';
import { SocialPostComposerViewSelectorsIDs } from './SocialPostComposerView.testIds';

interface ImageInsertEvent {
  nativeEvent: {
    uri?: string;
    linkUri?: string;
  };
}

const SocialPostComposerView: React.FC = () => {
  const tw = useTailwind();
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const isScreenTransitionComplete = useScreenTransitionComplete();
  const { profile } = useMyProfile();
  const inputRef = useRef<TextInput>(null);
  const [text, setText] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<{
    position: Position;
    isClosed: boolean;
  } | null>(null);
  const [gifUri, setGifUri] = useState<string | null>(null);
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);

  const composerAuthor = useMemo(
    () => ({
      id: profile?.profileId ?? COMPOSER_FEED_AUTHOR.id,
      username: profile?.handle ?? COMPOSER_FEED_AUTHOR.username,
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

  const canSubmit = selectedPosition != null && isComposerCommentValid(text);

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
    focusComposer();
  }, [focusComposer]);

  // Focusing mid-transition drops the keyboard on the native stack push, so
  // wait until the screen has settled before raising it.
  useEffect(() => {
    if (!isScreenTransitionComplete) {
      return;
    }
    focusComposer();
  }, [isScreenTransitionComplete, focusComposer]);

  const handlePost = useCallback(() => {
    if (!selectedPosition || !canSubmit) {
      return;
    }
    const item = mapPositionToFeedItem(selectedPosition.position, text.trim(), {
      isClosed: selectedPosition.isClosed,
      author: composerAuthor,
    });
    submitSocialV1ComposedPost({
      id: `composed-${Date.now()}`,
      authorHandle: profile?.handle ?? 'giga-whale',
      authorImageUrl: profile?.imageUrl,
      timestampMs: Date.now(),
      reactions: [],
      gifUri: gifUri ?? undefined,
      item,
    });
    // Pop the composer off the native stack; V1 is already mounted underneath
    // and its subscribed feed hook will react to the store update.
    navigation.goBack();
  }, [
    canSubmit,
    gifUri,
    navigation,
    composerAuthor,
    profile?.handle,
    profile?.imageUrl,
    selectedPosition,
    text,
  ]);

  return (
    <SafeAreaView
      edges={SCROLLABLE_SCREEN_SAFE_AREA_EDGES}
      style={tw.style('flex-1 bg-default')}
      testID={SocialPostComposerViewSelectorsIDs.CONTAINER}
    >
      <HeaderBase
        includesTopInset
        startAccessory={
          <ButtonIcon
            iconName={IconName.Close}
            size={ButtonIconSize.Md}
            onPress={handleClose}
            testID={SocialPostComposerViewSelectorsIDs.CLOSE_BUTTON}
            accessibilityLabel={strings('social_leaderboard.composer.close')}
          />
        }
        endAccessory={
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
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
              isDisabled={!canSubmit}
              onPress={handlePost}
              testID={SocialPostComposerViewSelectorsIDs.POST_BUTTON}
            >
              {strings('social_leaderboard.composer.post')}
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
          contentContainerStyle={tw.style('px-4 pt-2 pb-4 gap-4')}
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
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          {selectedPosition ? null : (
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Sm}
              startIconName={IconName.Card}
              onPress={() => setIsShareSheetOpen(true)}
              testID={SocialPostComposerViewSelectorsIDs.POSITION_CHIP}
            >
              {strings('social_leaderboard.composer.chip_position')}
            </Button>
          )}
          {gifUri ? null : (
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Sm}
              startIconName={IconName.Sparkle}
              onPress={handleGifChipPress}
              testID={SocialPostComposerViewSelectorsIDs.GIF_CHIP}
            >
              {strings('social_leaderboard.composer.chip_gif')}
            </Button>
          )}
        </Box>
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

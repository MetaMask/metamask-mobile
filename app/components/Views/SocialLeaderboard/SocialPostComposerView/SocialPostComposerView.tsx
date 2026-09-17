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
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { Position } from '@metamask/social-controllers';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../../locales/i18n';
import superheroAvatar from '../../../images/socialV1/superhero.png';
import { useMyProfile } from '../MyProfileView/hooks';
import { SCROLLABLE_SCREEN_SAFE_AREA_EDGES } from '../shared/scrollableScreenSafeArea';
import SocialFeedPositionCard from '../SocialV1View/feed/components/SocialFeedPositionCard';
import { submitSocialV1ComposedPost } from '../SocialV1View/feed/store/socialV1ComposedFeedStore';
import type { SocialV1FeedItem } from '../SocialV1View/feed/types';
import {
  clipComposerComment,
  COMPOSER_COMMENT_MAX_LENGTH,
  isComposerCommentValid,
} from './commentValidation';
import { mapPositionToFeedItem } from './mapPositionToFeedItem';
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
  const navigation = useNavigation();
  const { profile } = useMyProfile();
  const inputRef = useRef<TextInput>(null);
  const [text, setText] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<{
    position: Position;
    isClosed: boolean;
  } | null>(null);
  const [gifUri, setGifUri] = useState<string | null>(null);
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);

  const previewItem: SocialV1FeedItem | null = useMemo(() => {
    if (!selectedPosition) {
      return null;
    }
    return mapPositionToFeedItem(selectedPosition.position, text.trim(), {
      isClosed: selectedPosition.isClosed,
    });
  }, [selectedPosition, text]);

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

  const handleGifChipPress = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handlePost = useCallback(() => {
    if (!selectedPosition || !canSubmit) {
      return;
    }
    const item = mapPositionToFeedItem(selectedPosition.position, text.trim(), {
      isClosed: selectedPosition.isClosed,
    });
    submitSocialV1ComposedPost({
      id: `composed-${Date.now()}`,
      authorHandle: profile?.handle ?? 'giga-whale',
      authorImageUrl: profile?.imageUrl,
      winRateLabel: '78% WR',
      timestampMs: Date.now(),
      likeCount: 0,
      commentCount: 0,
      gifUri: gifUri ?? undefined,
      item,
    });
    navigation.goBack();
  }, [
    canSubmit,
    gifUri,
    navigation,
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
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Sm}
            isDisabled={!canSubmit}
            onPress={handlePost}
            testID={SocialPostComposerViewSelectorsIDs.POST_BUTTON}
          >
            {strings('social_leaderboard.composer.post')}
          </Button>
        }
        testID={SocialPostComposerViewSelectorsIDs.HEADER}
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
      </HeaderBase>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={tw.style('flex-1')}
      >
        <ScrollView
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('px-4 pt-2 pb-4 gap-4')}
          keyboardShouldPersistTaps="handled"
        >
          <Image
            source={
              profile?.imageUrl ? { uri: profile.imageUrl } : superheroAvatar
            }
            style={tw.style('w-10 h-10 rounded-full')}
          />
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={handleChangeText}
            placeholder={strings('social_leaderboard.composer.placeholder')}
            placeholderTextColor={tw.color('text-muted')}
            multiline
            autoFocus
            style={tw.style('text-default text-s-body-md min-h-24')}
            testID={SocialPostComposerViewSelectorsIDs.INPUT}
            {...{
              onImageChange: handleImageInsert,
            }}
          />

          {previewItem ? (
            <Box twClassName="relative">
              <SocialFeedPositionCard item={previewItem} hideComment />
              <Pressable
                onPress={() => setSelectedPosition(null)}
                accessibilityRole="button"
                accessibilityLabel={strings(
                  'social_leaderboard.composer.remove_position',
                )}
                testID={SocialPostComposerViewSelectorsIDs.REMOVE_POSITION}
                style={tw.style(
                  'absolute top-2 right-2 w-7 h-7 rounded-full bg-default items-center justify-center',
                )}
              >
                <ButtonIcon
                  iconName={IconName.Close}
                  size={ButtonIconSize.Sm}
                  onPress={() => setSelectedPosition(null)}
                />
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
          twClassName="px-4 py-3"
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

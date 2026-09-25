import React, { useCallback, useState } from 'react';
import {
  Image,
  Pressable,
  useWindowDimensions,
  type ListRenderItem,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlatList } from 'react-native-gesture-handler';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  Skeleton,
  Text,
  TextButton,
  TextColor,
  TextFieldSearch,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../locales/i18n';
import { GifPickerSheetSelectorsIDs } from './GifPickerSheet.testIds';
import type { KlipyGif } from './klipyClient';
import { useKlipyGifs } from './useKlipyGifs';

export interface GifPickerSheetProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

const SKELETON_KEYS = ['s1', 's2', 's3', 's4'] as const;

const GifPickerSheet: React.FC<GifPickerSheetProps> = ({
  onSelect,
  onClose,
}) => {
  const tw = useTailwind();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const { gifs, isLoading, error, loadMore, retry } = useKlipyGifs(query, true);
  const panelHeight = Math.max(280, Math.round(height * 0.42));

  const handleSelect = useCallback(
    (gif: KlipyGif) => {
      onSelect(gif.gifUrl);
    },
    [onSelect],
  );

  const renderItem = useCallback<ListRenderItem<KlipyGif>>(
    ({ item }) => (
      <Pressable
        onPress={() => handleSelect(item)}
        accessibilityRole="button"
        accessibilityLabel={
          item.title || strings('social_leaderboard.composer.chip_gif')
        }
        testID={GifPickerSheetSelectorsIDs.item(item.id)}
        style={tw.style('flex-1')}
      >
        <Box twClassName="relative overflow-hidden rounded-xl">
          <Image
            source={{ uri: item.previewUrl }}
            style={tw.style('w-full', { aspectRatio: 4 / 3 })}
            accessibilityIgnoresInvertColors
          />
          {item.title ? (
            <Box twClassName="absolute bottom-2 left-2 max-w-[85%] rounded-md bg-muted px-2 py-1">
              <Text variant={TextVariant.BodySm} numberOfLines={1}>
                {item.title}
              </Text>
            </Box>
          ) : null}
        </Box>
      </Pressable>
    ),
    [handleSelect, tw],
  );

  const errorMessage =
    error === 'missing_api_key'
      ? strings('social_leaderboard.composer.gifs_missing_key')
      : strings('social_leaderboard.composer.gifs_error');

  return (
    <Box
      twClassName="border-t border-muted bg-default"
      style={tw.style({ height: panelHeight })}
      testID={GifPickerSheetSelectorsIDs.SHEET}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="px-2 pt-2"
      >
        <Box twClassName="w-10" />
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          twClassName="flex-1 text-center"
        >
          {strings('social_leaderboard.composer.gifs_title')}
        </Text>
        <ButtonIcon
          iconName={IconName.Close}
          size={ButtonIconSize.Md}
          onPress={onClose}
          testID={GifPickerSheetSelectorsIDs.CLOSE_BUTTON}
          accessibilityLabel={strings('social_leaderboard.composer.gifs_close')}
        />
      </Box>

      <Box twClassName="px-4 py-2">
        <TextFieldSearch
          value={query}
          onChangeText={setQuery}
          onPressClearButton={() => setQuery('')}
          placeholder={strings(
            'social_leaderboard.composer.gifs_search_placeholder',
          )}
          autoFocus={false}
          inputProps={{
            testID: GifPickerSheetSelectorsIDs.SEARCH_INPUT,
            accessibilityLabel: strings(
              'social_leaderboard.composer.gifs_search_placeholder',
            ),
          }}
        />
      </Box>

      {error && gifs.length === 0 ? (
        <Box
          twClassName="flex-1 items-center justify-center gap-2 px-4"
          testID={GifPickerSheetSelectorsIDs.ERROR}
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
            {errorMessage}
          </Text>
          {error === 'missing_api_key' ? null : (
            <TextButton
              onPress={retry}
              testID={GifPickerSheetSelectorsIDs.RETRY}
            >
              {strings('social_leaderboard.composer.retry')}
            </TextButton>
          )}
        </Box>
      ) : isLoading && gifs.length === 0 ? (
        <Box twClassName="flex-row flex-wrap gap-2 px-4">
          {SKELETON_KEYS.map((key) => (
            <Box key={key} twClassName="w-[48%]">
              <Skeleton height={120} width="100%" />
            </Box>
          ))}
        </Box>
      ) : gifs.length === 0 ? (
        <Box
          twClassName="flex-1 items-center justify-center px-4"
          testID={GifPickerSheetSelectorsIDs.EMPTY}
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('social_leaderboard.composer.gifs_empty')}
          </Text>
        </Box>
      ) : (
        <FlatList
          data={gifs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('gap-2', {
            paddingBottom: Math.max(insets.bottom, 12),
          })}
          columnWrapperStyle={tw.style('gap-2 px-4')}
          keyboardShouldPersistTaps="handled"
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          testID={GifPickerSheetSelectorsIDs.LIST}
        />
      )}
    </Box>
  );
};

export default GifPickerSheet;

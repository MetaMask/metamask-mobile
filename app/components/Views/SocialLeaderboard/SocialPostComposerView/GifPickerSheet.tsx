import React, { useCallback, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  useWindowDimensions,
  type ListRenderItem,
} from 'react-native';
import { GestureHandlerRootView, FlatList } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  Skeleton,
  Text,
  TextButton,
  TextColor,
  TextFieldSearch,
  TextVariant,
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
        <Box twClassName="overflow-hidden rounded-xl">
          <Image
            source={{ uri: item.previewUrl }}
            style={tw.style('w-full', { aspectRatio: 4 / 3 })}
            accessibilityIgnoresInvertColors
          />
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
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaProvider>
        <GestureHandlerRootView style={tw.style('flex-1')}>
          <BottomSheet
            onClose={onClose}
            testID={GifPickerSheetSelectorsIDs.SHEET}
          >
            <Box style={tw.style({ height: panelHeight })}>
              <BottomSheetHeader
                onClose={onClose}
                closeButtonProps={{
                  testID: GifPickerSheetSelectorsIDs.CLOSE_BUTTON,
                  accessibilityLabel: strings(
                    'social_leaderboard.composer.gifs_close',
                  ),
                }}
              >
                {strings('social_leaderboard.composer.gifs_title')}
              </BottomSheetHeader>

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
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextDefault}
                  >
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
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                  >
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
                  contentContainerStyle={tw.style('gap-2 pb-3')}
                  columnWrapperStyle={tw.style('gap-2 px-4')}
                  keyboardShouldPersistTaps="handled"
                  onEndReached={loadMore}
                  onEndReachedThreshold={0.4}
                  testID={GifPickerSheetSelectorsIDs.LIST}
                />
              )}
            </Box>
          </BottomSheet>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </Modal>
  );
};

export default GifPickerSheet;

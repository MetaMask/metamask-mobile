import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useWindowDimensions } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import Fuse from 'fuse.js';
import { useNavigation } from '@react-navigation/native';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import {
  Box,
  BottomSheet,
  ContentVariant,
  FontWeight,
  HeaderStandard,
  ListItemSelect,
  Text,
  TextFieldSearch,
  TextVariant,
  BottomSheetRef,
} from '@metamask/design-system-react-native';
import type { Region } from '../../types';

const MAX_REGION_RESULTS = 20;

export type { Region };

// Simple callback registry for onValueChange
let onValueChangeCallback: ((region: Region) => void) | null = null;

export const setOnValueChange = (callback: (region: Region) => void) => {
  onValueChangeCallback = callback;
};

export const clearOnValueChange = () => {
  onValueChangeCallback = null;
};

export interface RegionSelectorModalParams {
  regions: Region[];
  renderAreaCode?: boolean;
  selectedRegionKey?: string | null;
}

export const createRegionSelectorModalNavigationDetails =
  createNavigationDetails<RegionSelectorModalParams>(
    Routes.CARD.MODALS.ID,
    Routes.CARD.MODALS.REGION_SELECTION,
  );

function RegionSelectorModal() {
  const navigation = useNavigation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const listRef = useRef<FlatList<Region>>(null);
  const { regions, renderAreaCode, selectedRegionKey } =
    useParams<RegionSelectorModalParams>();
  const [searchString, setSearchString] = useState('');
  const [currentData, setCurrentData] = useState<Region[]>(regions || []);
  const { height: screenHeight } = useWindowDimensions();

  // Sync currentData when regions param changes
  useEffect(() => {
    setCurrentData(regions || []);
  }, [regions]);

  const listStyle = useMemo(
    () => ({ height: screenHeight * 0.65 }),
    [screenHeight],
  );

  const fuseData = useMemo(
    () =>
      new Fuse(currentData, {
        shouldSort: true,
        threshold: 0.2,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: ['name'],
      }),
    [currentData],
  );

  const dataSearchResults = useMemo(() => {
    if (searchString.length > 0) {
      const results = fuseData
        .search(searchString)
        ?.slice(0, MAX_REGION_RESULTS);

      const mappedResults: Region[] =
        results
          ?.map((result) =>
            typeof result === 'object' && result !== null && 'item' in result
              ? result.item
              : result,
          )
          .filter((item): item is Region => Boolean(item)) || [];

      return mappedResults;
    }

    if (!currentData?.length) return [];

    return [...currentData].sort((a, b) => a.name.localeCompare(b.name));
  }, [searchString, fuseData, currentData]);

  const scrollToTop = useCallback(() => {
    if (listRef?.current) {
      listRef.current.scrollToOffset({
        animated: false,
        offset: 0,
      });
    }
  }, []);

  const handleOnRegionPressCallback = useCallback((region: Region) => {
    onValueChangeCallback?.(region);
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const renderRegionItem = useCallback(
    ({ item: region }: { item: Region }) => {
      if (!region) return null;

      return (
        <ListItemSelect
          variant={ContentVariant.OneLine}
          isSelected={selectedRegionKey === region.key}
          onPress={() => handleOnRegionPressCallback(region)}
          accessibilityRole="button"
          accessible
          testID="region-selector-item"
          titleStartAccessory={
            <Text
              variant={TextVariant.BodyMd}
              testID="region-selector-item-emoji"
            >
              {region.emoji}
            </Text>
          }
          title={
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              numberOfLines={1}
              testID="region-selector-item-name"
            >
              {region.name}
            </Text>
          }
          titleEndAccessory={
            renderAreaCode && region.areaCode ? (
              <Text
                variant={TextVariant.BodyMd}
                twClassName="text-text-alternative"
                testID="region-selector-item-area-code"
              >
                (+{region.areaCode})
              </Text>
            ) : undefined
          }
        />
      );
    },
    [selectedRegionKey, renderAreaCode, handleOnRegionPressCallback],
  );

  const renderEmptyList = useCallback(
    () => (
      <Box twClassName="p-4 items-center" testID="region-selector-empty-list">
        <Text variant={TextVariant.BodyMd}>
          {strings('card.card_onboarding.errors.no_region_results', {
            searchString,
          })}
        </Text>
      </Box>
    ),
    [searchString],
  );

  const handleSearchTextChange = useCallback(
    (text: string) => {
      setSearchString(text);
      scrollToTop();
    },
    [scrollToTop],
  );

  const clearSearchText = useCallback(() => {
    setSearchString('');
    scrollToTop();
  }, [scrollToTop]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const onModalHide = useCallback(() => {
    setCurrentData(regions || []);
    setSearchString('');
  }, [regions]);

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={navigation.goBack}
      onClose={onModalHide}
      keyboardAvoidingViewEnabled={false}
      testID="region-selector-modal"
    >
      <HeaderStandard
        title={strings('card.card_onboarding.region_selector.title')}
        onClose={handleClose}
        closeButtonProps={{ testID: 'region-selector-close-button' }}
      />
      <Box twClassName="px-4 pb-4">
        <TextFieldSearch
          value={searchString}
          onPressClearButton={clearSearchText}
          onFocus={scrollToTop}
          onChangeText={handleSearchTextChange}
          clearButtonProps={{ testID: 'search-clear-button' }}
          inputProps={{
            autoComplete: 'one-time-code',
            testID: 'region-selector-search-input',
          }}
        />
      </Box>
      <FlatList
        ref={listRef}
        style={listStyle}
        data={dataSearchResults}
        renderItem={renderRegionItem}
        extraData={selectedRegionKey}
        keyExtractor={(item) => `${item?.key}-${item?.areaCode}`}
        ListEmptyComponent={renderEmptyList}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="always"
      />
    </BottomSheet>
  );
}

export default RegionSelectorModal;

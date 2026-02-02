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
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import HeaderCenter from '../../../../../component-library/components-temp/HeaderCenter';
import ListItemSelect from '../../../../../component-library/components/List/ListItemSelect';
import ListItemColumn, {
  WidthType,
} from '../../../../../component-library/components/List/ListItemColumn';
import TextFieldSearch from '../../../../../component-library/components/Form/TextFieldSearch';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { useSelector } from 'react-redux';
import { selectSelectedCountry } from '../../../../../core/redux/slices/card';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';

const MAX_REGION_RESULTS = 20;

export interface Region {
  key: string; // country code
  name: string;
  emoji?: string;
  areaCode?: string;
}

// Simple callback registry for onValueChange
let onValueChangeCallback: ((region: Region) => void) | null = null;

export const setOnValueChange = (callback: (region: Region) => void) => {
  onValueChangeCallback = callback;
};

export const clearOnValueChange = () => {
  onValueChangeCallback = null;
};

interface RegionSelectorModalParams {
  regions: Region[];
  renderAreaCode?: boolean;
}

export const createRegionSelectorModalNavigationDetails =
  createNavigationDetails<RegionSelectorModalParams>(
    Routes.CARD.MODALS.ID,
    Routes.CARD.MODALS.REGION_SELECTION,
  );

function RegionSelectorModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const listRef = useRef<FlatList<Region>>(null);
  const { regions, renderAreaCode } = useParams<RegionSelectorModalParams>();
  const [searchString, setSearchString] = useState('');
  const selectedCountry = useSelector(selectSelectedCountry);
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
          isSelected={selectedCountry?.key === region.key}
          onPress={() => handleOnRegionPressCallback(region)}
          accessibilityRole="button"
          accessible
          testID="region-selector-item"
        >
          <ListItemColumn widthType={WidthType.Fill}>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-2"
            >
              <Box twClassName="pr-2" testID="region-selector-item-emoji">
                <Text variant={TextVariant.BodyLg}>{region.emoji}</Text>
              </Box>
              <Box testID="region-selector-item-name">
                <Text variant={TextVariant.BodyLg}>{region.name}</Text>
              </Box>
              {renderAreaCode && region.areaCode && (
                <Box testID="region-selector-item-area-code">
                  <Text variant={TextVariant.BodyLg}>(+{region.areaCode})</Text>
                </Box>
              )}
            </Box>
          </ListItemColumn>
        </ListItemSelect>
      );
    },
    [selectedCountry, renderAreaCode, handleOnRegionPressCallback],
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
      shouldNavigateBack
      onClose={onModalHide}
      keyboardAvoidingViewEnabled={false}
      testID="region-selector-modal"
    >
      <HeaderCenter
        title={strings('card.card_onboarding.region_selector.title')}
        onClose={handleClose}
        closeButtonProps={{ testID: 'region-selector-close-button' }}
      />
      <Box twClassName="px-4 pb-4">
        <TextFieldSearch
          value={searchString}
          showClearButton={searchString.length > 0}
          onPressClearButton={clearSearchText}
          onFocus={scrollToTop}
          onChangeText={handleSearchTextChange}
          autoComplete="one-time-code"
          testID="region-selector-search-input"
        />
      </Box>
      <FlatList
        ref={listRef}
        style={listStyle}
        data={dataSearchResults}
        renderItem={renderRegionItem}
        extraData={selectedCountry}
        keyExtractor={(item) => `${item?.key}-${item?.areaCode}`}
        ListEmptyComponent={renderEmptyList}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="always"
      />
    </BottomSheet>
  );
}

export default RegionSelectorModal;

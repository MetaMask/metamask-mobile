import React, { useCallback, useRef, useState } from 'react';
import { FlatList, View, useWindowDimensions } from 'react-native';
import Fuse from 'fuse.js';

import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import ListItemSelect from '../../../../../../../component-library/components/List/ListItemSelect';
import ListItemColumn, {
  WidthType,
} from '../../../../../../../component-library/components/List/ListItemColumn';
import TextFieldSearch from '../../../../../../../component-library/components/Form/TextFieldSearch';

import styleSheet from './RegionSelectorModal.styles';
import { useStyles } from '../../../../../../hooks/useStyles';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../../util/navigation/navUtils';
import { DepositRegion, DEPOSIT_REGIONS } from '../../../constants';
import Routes from '../../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../../locales/i18n';

const MAX_REGION_RESULTS = 20;

interface RegionSelectorModalNavigationDetails {
  selectedRegionCode?: string;
  handleSelectRegion?: (region: DepositRegion) => void;
}

export const createRegionSelectorModalNavigationDetails =
  createNavigationDetails(
    Routes.DEPOSIT.MODALS.ID,
    Routes.DEPOSIT.MODALS.REGION_SELECTOR,
  );

function RegionSelectorModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const listRef = useRef<FlatList>(null);

  const { selectedRegionCode, handleSelectRegion } =
    useParams<RegionSelectorModalNavigationDetails>();
  const [searchString, setSearchString] = useState('');
  const { height: screenHeight } = useWindowDimensions();
  const { styles } = useStyles(styleSheet, {
    screenHeight,
  });

  const fuseData = React.useMemo(
    () =>
      new Fuse(DEPOSIT_REGIONS, {
        shouldSort: true,
        threshold: 0.2,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: ['name'],
      }),
    [],
  );

  const searchResults = React.useMemo(() => {
    if (searchString.length > 0) {
      const results = fuseData
        .search(searchString)
        ?.slice(0, MAX_REGION_RESULTS);

      if (results?.length) {
        return results;
      }
      return [];
    }

    const popularRegions = DEPOSIT_REGIONS.filter(
      (region) => region.recommended,
    );

    if (popularRegions.length) {
      return [
        ...popularRegions,
        ...DEPOSIT_REGIONS.filter((region) => !region.recommended),
      ];
    }

    return DEPOSIT_REGIONS;
  }, [searchString, fuseData]);

  const handleSelectRegionCallback = useCallback(
    (region: DepositRegion) => {
      if (handleSelectRegion) {
        handleSelectRegion(region);
      }
      sheetRef.current?.onCloseBottomSheet();
    },
    [handleSelectRegion],
  );

  const scrollToTop = useCallback(() => {
    if (listRef?.current) {
      listRef?.current.scrollToOffset({
        animated: false,
        offset: 0,
      });
    }
  }, []);

  const handleSearchTextChange = useCallback(
    (text: string) => {
      setSearchString(text);
      scrollToTop();
    },
    [scrollToTop],
  );

  const clearSearchText = useCallback(() => {
    handleSearchTextChange('');
  }, [handleSearchTextChange]);

  const renderRegion = useCallback(
    ({ item: region }: { item: DepositRegion }) => (
      <ListItemSelect
        isSelected={selectedRegionCode === region.code}
        onPress={() => {
          if (region.supported) {
            handleSelectRegionCallback(region);
          }
        }}
        accessibilityRole="button"
        accessible
        disabled={!region.supported}
      >
        <ListItemColumn widthType={WidthType.Auto}>
          <Text
            variant={TextVariant.BodyLGMedium}
            color={region.supported ? TextColor.Default : TextColor.Alternative}
          >
            {region.flag}
          </Text>
        </ListItemColumn>
        <ListItemColumn widthType={WidthType.Fill}>
          <Text
            variant={TextVariant.BodyLGMedium}
            color={region.supported ? TextColor.Default : TextColor.Alternative}
          >
            {region.name}
          </Text>
        </ListItemColumn>
      </ListItemSelect>
    ),
    [handleSelectRegionCallback, selectedRegionCode],
  );

  const renderEmptyList = useCallback(
    () => (
      <ListItemSelect isSelected={false} isDisabled>
        <Text variant={TextVariant.BodyLGMedium}>
          {strings('deposit.region_modal.no_regions_found', {
            searchString,
          })}
        </Text>
      </ListItemSelect>
    ),
    [searchString],
  );

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack>
      <BottomSheetHeader onClose={() => sheetRef.current?.onCloseBottomSheet()}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('deposit.region_modal.select_a_region')}
        </Text>
      </BottomSheetHeader>
      <View style={styles.searchContainer}>
        <TextFieldSearch
          value={searchString}
          showClearButton={searchString.length > 0}
          onPressClearButton={clearSearchText}
          onFocus={scrollToTop}
          onChangeText={handleSearchTextChange}
          placeholder={strings('deposit.region_modal.search_by_country')}
        />
      </View>
      <FlatList
        style={styles.list}
        ref={listRef}
        data={searchResults}
        renderItem={renderRegion}
        extraData={selectedRegionCode}
        keyExtractor={(item) => item.code}
        ListEmptyComponent={renderEmptyList}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="always"
      />
    </BottomSheet>
  );
}

export default RegionSelectorModal;

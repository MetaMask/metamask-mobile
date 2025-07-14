import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
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
import { createNavigationDetails } from '../../../../../../../util/navigation/navUtils';
import { DepositRegion, DEPOSIT_REGIONS } from '../../../constants';
import Routes from '../../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../../locales/i18n';
import { useDepositSDK } from '../../../sdk';

const MAX_REGION_RESULTS = 20;

export const createRegionSelectorModalNavigationDetails =
  createNavigationDetails(
    Routes.DEPOSIT.MODALS.ID,
    Routes.DEPOSIT.MODALS.REGION_SELECTOR,
  );

function RegionSelectorModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const listRef = useRef<FlatList<DepositRegion>>(null);

  const { selectedRegion, setSelectedRegion } = useDepositSDK();
  const [searchString, setSearchString] = useState('');
  const { height: screenHeight } = useWindowDimensions();
  const { styles } = useStyles(styleSheet, {
    screenHeight,
  });

  const fuseData = useMemo(
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

  const dataSearchResults = useMemo(() => {
    if (searchString.length > 0) {
      const results = fuseData
        .search(searchString)
        ?.slice(0, MAX_REGION_RESULTS);
      return results || [];
    }

    return [...DEPOSIT_REGIONS].sort((a, b) => {
      if (a.recommended && !b.recommended) return -1;
      if (!a.recommended && b.recommended) return 1;
      return 0;
    });
  }, [searchString, fuseData]);

  const scrollToTop = useCallback(() => {
    if (listRef?.current) {
      listRef.current.scrollToOffset({
        animated: false,
        offset: 0,
      });
    }
  }, []);

  const handleOnRegionPressCallback = useCallback(
    (region: DepositRegion) => {
      if (region.supported && setSelectedRegion) {
        setSelectedRegion(region);
        sheetRef.current?.onCloseBottomSheet();
      }
    },
    [setSelectedRegion],
  );

  const renderRegionItem = useCallback(
    ({ item: region }: { item: DepositRegion }) => (
      <ListItemSelect
        isSelected={selectedRegion?.isoCode === region.isoCode}
        onPress={() => {
          if (region.supported) {
            handleOnRegionPressCallback(region);
          }
        }}
        accessibilityRole="button"
        accessible
        disabled={!region.supported}
      >
        <ListItemColumn widthType={WidthType.Fill}>
          <View style={styles.region}>
            <View style={styles.emoji}>
              <Text
                variant={TextVariant.BodyLGMedium}
                color={
                  region.supported ? TextColor.Default : TextColor.Alternative
                }
              >
                {region.flag}
              </Text>
            </View>
            <View>
              <Text
                variant={TextVariant.BodyLGMedium}
                color={
                  region.supported ? TextColor.Default : TextColor.Alternative
                }
              >
                {region.name}
              </Text>
            </View>
          </View>
        </ListItemColumn>
      </ListItemSelect>
    ),
    [handleOnRegionPressCallback, selectedRegion, styles.region, styles.emoji],
  );

  const renderEmptyList = useCallback(
    () => (
      <View style={styles.emptyList}>
        <Text variant={TextVariant.BodyLGMedium}>
          {strings('fiat_on_ramp_aggregator.region.no_region_results', {
            searchString,
          })}
        </Text>
      </View>
    ),
    [searchString, styles.emptyList],
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
        ref={listRef}
        style={styles.list}
        data={dataSearchResults}
        renderItem={renderRegionItem}
        extraData={selectedRegion?.isoCode}
        keyExtractor={(item) => item.isoCode}
        ListEmptyComponent={renderEmptyList}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="always"
      />
    </BottomSheet>
  );
}

export default RegionSelectorModal;

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import {
  FlatList,
  TouchableWithoutFeedback,
} from 'react-native-gesture-handler';
import Fuse from 'fuse.js';

import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import ListItemColumn, {
  WidthType,
} from '../../../../../../../component-library/components/List/ListItemColumn';
import TextFieldSearch from '../../../../../../../component-library/components/Form/TextFieldSearch';

import styleSheet from './RegionSelectorModal.styles';
import { useStyles } from '../../../../../../hooks/useStyles';
import { DepositRegion, DEPOSIT_REGIONS } from '../../../constants';
import { strings } from '../../../../../../../../locales/i18n';
import { useDepositSDK } from '../../../sdk';
import useAnalytics from '../../../../hooks/useAnalytics';

const MAX_REGION_RESULTS = 20;

function RegionSelectorModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const listRef = useRef<FlatList<DepositRegion>>(null);

  const { selectedRegion, setSelectedRegion, isAuthenticated } =
    useDepositSDK();
  const [searchString, setSearchString] = useState('');
  const { height: screenHeight } = useWindowDimensions();
  const { styles } = useStyles(styleSheet, {
    screenHeight,
  });
  const trackEvent = useAnalytics();

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
        trackEvent('RAMPS_REGION_SELECTED', {
          ramp_type: 'DEPOSIT',
          region: region.isoCode,
          is_authenticated: isAuthenticated,
        });

        setSelectedRegion(region);
        sheetRef.current?.onCloseBottomSheet();
      }
    },
    [setSelectedRegion, isAuthenticated, trackEvent],
  );

  const renderRegionItem = useCallback(
    ({ item: region }: { item: DepositRegion }) => {
      const isSelected = selectedRegion?.isoCode === region.isoCode;

      return (
        <TouchableWithoutFeedback
          onPress={() => {
            if (region.supported) {
              handleOnRegionPressCallback(region);
            }
          }}
          disabled={!region.supported}
          accessibilityRole="button"
          accessible
        >
          <View
            style={[
              styles.listItem,
              isSelected && styles.selectedItem,
              !region.supported && styles.disabledItem,
            ]}
          >
            <ListItemColumn widthType={WidthType.Fill}>
              <View style={styles.region}>
                <View style={styles.emoji}>
                  <Text
                    variant={TextVariant.BodyLGMedium}
                    color={
                      region.supported
                        ? TextColor.Default
                        : TextColor.Alternative
                    }
                  >
                    {region.flag}
                  </Text>
                </View>
                <View>
                  <Text
                    variant={TextVariant.BodyLGMedium}
                    color={
                      region.supported
                        ? TextColor.Default
                        : TextColor.Alternative
                    }
                  >
                    {region.name}
                  </Text>
                </View>
              </View>
            </ListItemColumn>
          </View>
        </TouchableWithoutFeedback>
      );
    },
    [
      handleOnRegionPressCallback,
      selectedRegion?.isoCode,
      styles.disabledItem,
      styles.emoji,
      styles.listItem,
      styles.region,
      styles.selectedItem,
    ],
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
        removeClippedSubviews={false}
        scrollEnabled
        nestedScrollEnabled
      />
    </BottomSheet>
  );
}

export default RegionSelectorModal;

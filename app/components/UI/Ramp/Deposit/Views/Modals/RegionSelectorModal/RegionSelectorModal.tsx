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
import HeaderCompactStandard from '../../../../../../../component-library/components-temp/HeaderCompactStandard';
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
import { DepositRegion } from '@consensys/native-ramps-sdk';
import Routes from '../../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../../locales/i18n';
import { useDepositSDK } from '../../../sdk';
import useAnalytics from '../../../../hooks/useAnalytics';

const MAX_REGION_RESULTS = 20;

interface RegionSelectorModalParams {
  regions: DepositRegion[];
  onRegionSelect?: (region: DepositRegion) => void;
  selectedRegion?: DepositRegion | null;
  allRegionsSelectable?: boolean;
  updateGlobalRegion?: boolean;
  trackSelection?: boolean;
}

export const createRegionSelectorModalNavigationDetails =
  createNavigationDetails<RegionSelectorModalParams>(
    Routes.DEPOSIT.MODALS.ID,
    Routes.DEPOSIT.MODALS.REGION_SELECTOR,
  );

function RegionSelectorModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const listRef = useRef<FlatList<DepositRegion>>(null);

  const {
    selectedRegion: sdkSelectedRegion,
    setSelectedRegion,
    isAuthenticated,
  } = useDepositSDK();
  const {
    regions,
    onRegionSelect,
    selectedRegion: selectedRegionParam,
    allRegionsSelectable = false,
    updateGlobalRegion = true,
    trackSelection = true,
  } = useParams<RegionSelectorModalParams>();

  const selectedRegion = selectedRegionParam ?? sdkSelectedRegion;
  const [searchString, setSearchString] = useState('');
  const { height: screenHeight } = useWindowDimensions();
  const { styles } = useStyles(styleSheet, {
    screenHeight,
  });
  const trackEvent = useAnalytics();

  const fuseData = useMemo(
    () =>
      new Fuse(regions || [], {
        shouldSort: true,
        threshold: 0.2,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: ['name'],
      }),
    [regions],
  );

  const dataSearchResults = useMemo(() => {
    if (!regions) return [];

    if (searchString.length > 0) {
      const results = fuseData
        .search(searchString)
        ?.slice(0, MAX_REGION_RESULTS);
      return results || [];
    }

    return [...regions].sort((a, b) => {
      if (a.recommended && !b.recommended) return -1;
      if (!a.recommended && b.recommended) return 1;
      return 0;
    });
  }, [searchString, fuseData, regions]);

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
      const isSelectable = allRegionsSelectable || region.supported;

      if (isSelectable) {
        if (onRegionSelect) {
          onRegionSelect(region);
        }

        if (updateGlobalRegion) {
          setSelectedRegion(region);
        }

        if (trackSelection) {
          trackEvent('RAMPS_REGION_SELECTED', {
            ramp_type: 'DEPOSIT',
            region: region.isoCode,
            is_authenticated: isAuthenticated,
          });
        }

        sheetRef.current?.onCloseBottomSheet();
      }
    },
    [
      onRegionSelect,
      allRegionsSelectable,
      updateGlobalRegion,
      trackSelection,
      trackEvent,
      isAuthenticated,
      setSelectedRegion,
    ],
  );

  const renderRegionItem = useCallback(
    ({ item: region }: { item: DepositRegion }) => {
      const isSelected = region.isoCode === selectedRegion?.isoCode;
      const isSelectable = allRegionsSelectable || region.supported;

      return (
        <ListItemSelect
          isSelected={isSelected}
          onPress={() => {
            handleOnRegionPressCallback(region);
          }}
          accessibilityRole="button"
          accessible
          disabled={!isSelectable}
        >
          <ListItemColumn widthType={WidthType.Fill}>
            <View style={styles.region}>
              <View style={styles.emoji}>
                <Text
                  variant={TextVariant.BodyLGMedium}
                  color={
                    isSelectable ? TextColor.Default : TextColor.Alternative
                  }
                >
                  {region.flag}
                </Text>
              </View>
              <View>
                <Text
                  variant={TextVariant.BodyLGMedium}
                  color={
                    isSelectable ? TextColor.Default : TextColor.Alternative
                  }
                >
                  {region.name}
                </Text>
              </View>
            </View>
          </ListItemColumn>
        </ListItemSelect>
      );
    },
    [
      selectedRegion?.isoCode,
      allRegionsSelectable,
      handleOnRegionPressCallback,
      styles.region,
      styles.emoji,
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
      <HeaderCompactStandard
        title={strings('deposit.region_modal.select_a_region')}
        onClose={() => sheetRef.current?.onCloseBottomSheet()}
      />
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
        keyExtractor={(item) => item?.isoCode}
        ListEmptyComponent={renderEmptyList}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="always"
      />
    </BottomSheet>
  );
}

export default RegionSelectorModal;

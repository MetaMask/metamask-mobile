import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  DefaultSectionT,
  SectionList,
  SectionListData,
  View,
  useWindowDimensions,
} from 'react-native';
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
import ListItem from '../../../../../../../components/Base/ListItem';

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
  const list = useRef<SectionList<DepositRegion>>(null);

  const { selectedRegionCode, handleSelectRegion } =
    useParams<RegionSelectorModalNavigationDetails>();
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

      if (results?.length) {
        return [
          {
            title: null,
            data: results,
          },
        ];
      }
      return [];
    }

    const popularRegions = DEPOSIT_REGIONS.filter(
      (region) => region.recommended,
    );

    if (popularRegions.length) {
      return [
        {
          title: strings('fiat_on_ramp_aggregator.region.popular_regions'),
          data: popularRegions,
        },
        {
          title: strings('fiat_on_ramp_aggregator.region.regions'),
          data: DEPOSIT_REGIONS.filter((region) => !region.recommended),
        },
      ];
    }

    return [
      {
        title: null,
        data: DEPOSIT_REGIONS,
      },
    ];
  }, [searchString, fuseData]);

  const scrollToTop = useCallback(() => {
    if (list?.current && dataSearchResults?.length) {
      list.current?.scrollToLocation({
        animated: false,
        itemIndex: 0,
        sectionIndex: 0,
      });
    }
  }, [dataSearchResults?.length]);

  const handleOnRegionPressCallback = useCallback(
    (region: DepositRegion) => {
      if (region.supported && handleSelectRegion) {
        handleSelectRegion(region);
        sheetRef.current?.onCloseBottomSheet();
      }
    },
    [handleSelectRegion],
  );

  const renderRegionItem = useCallback(
    ({ item: region }: { item: DepositRegion }) => (
      <ListItemSelect
        isSelected={selectedRegionCode === region.isoCode}
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
    [
      handleOnRegionPressCallback,
      selectedRegionCode,
      styles.region,
      styles.emoji,
    ],
  );

  const renderEmptyList = useMemo(
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

  const renderSectionHeader = ({
    section: { title: sectionTitle },
  }: {
    section: SectionListData<DepositRegion, DefaultSectionT>;
  }) => {
    if (!sectionTitle) return null;
    return (
      <ListItem style={styles.listItem}>
        <Text variant={TextVariant.BodyLGMedium}>{sectionTitle}</Text>
      </ListItem>
    );
  };

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
      <SectionList
        ref={list}
        style={styles.list}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="always"
        nestedScrollEnabled
        sections={dataSearchResults}
        renderItem={renderRegionItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.isoCode}
        ListEmptyComponent={renderEmptyList}
        stickySectionHeadersEnabled={false}
      />
    </BottomSheet>
  );
}

export default RegionSelectorModal;

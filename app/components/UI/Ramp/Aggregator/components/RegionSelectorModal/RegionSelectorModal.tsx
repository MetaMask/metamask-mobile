import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from 'react';
import { View, useWindowDimensions } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import Fuse from 'fuse.js';

import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import HeaderCenter from '../../../../../../component-library/components-temp/HeaderCenter';
import ListItemSelect from '../../../../../../component-library/components/List/ListItemSelect';
import ListItemColumn, {
  WidthType,
} from '../../../../../../component-library/components/List/ListItemColumn';
import TextFieldSearch from '../../../../../../component-library/components/Form/TextFieldSearch';
import Icon, {
  IconName,
} from '../../../../../../component-library/components/Icons/Icon';

import styleSheet from './RegionSelectorModal.styles';
import { useStyles } from '../../../../../hooks/useStyles';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import { Region } from '../../types';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import { useRampSDK } from '../../sdk';
import useAnalytics from '../../../hooks/useAnalytics';

const MAX_REGION_RESULTS = 20;

enum RegionViewType {
  COUNTRY = 'COUNTRY',
  STATE = 'STATE',
}

interface RegionSelectorModalParams {
  regions: Region[];
}

export const createRegionSelectorModalNavigationDetails =
  createNavigationDetails<RegionSelectorModalParams>(
    Routes.RAMP.MODALS.ID,
    Routes.RAMP.MODALS.REGION_SELECTOR,
  );

function RegionSelectorModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const listRef = useRef<FlatList<Region>>(null);

  const { selectedRegion, setSelectedRegion, isBuy } = useRampSDK();
  const { regions } = useParams<RegionSelectorModalParams>();
  const [searchString, setSearchString] = useState('');
  const [activeView, setActiveView] = useState(RegionViewType.COUNTRY);
  const [currentData, setCurrentData] = useState<Region[]>(regions || []);
  const [regionInTransit, setRegionInTransit] = useState<Region | null>(null);
  const { height: screenHeight } = useWindowDimensions();
  const { styles } = useStyles(styleSheet, {
    screenHeight,
  });
  const trackEvent = useAnalytics();

  useEffect(() => {
    if (regions && activeView === RegionViewType.COUNTRY) {
      setCurrentData(regions);
    }
  }, [regions, activeView]);

  const fuseData = useMemo(() => {
    const flatRegions: Region[] = currentData.reduce(
      (acc: Region[], region: Region) => [
        ...acc,
        region,
        ...((region.states as Region[]) || []),
      ],
      [],
    );
    return new Fuse(flatRegions, {
      shouldSort: true,
      threshold: 0.2,
      location: 0,
      distance: 100,
      maxPatternLength: 32,
      minMatchCharLength: 1,
      keys: ['name'],
    });
  }, [currentData]);

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

    return [...currentData].sort((a, b) => {
      if (a.recommended && !b.recommended) return -1;
      if (!a.recommended && b.recommended) return 1;
      return 0;
    });
  }, [searchString, fuseData, currentData]);

  const scrollToTop = useCallback(() => {
    if (listRef?.current) {
      listRef.current.scrollToOffset({
        animated: false,
        offset: 0,
      });
    }
  }, []);

  const handleOnRegionPressCallback = useCallback(
    async (region: Region) => {
      if (region.states && region.states.length > 0) {
        setActiveView(RegionViewType.STATE);
        setRegionInTransit(region);
        setCurrentData(region.states as Region[]);
        setSearchString('');
        scrollToTop();
        return;
      }

      trackEvent('RAMP_REGION_SELECTED', {
        country_id: regionInTransit?.id ?? region.id,
        state_id: regionInTransit ? region.id : undefined,
        location: isBuy ? 'Amount to Buy Screen' : 'Amount to Sell Screen',
        is_unsupported_onramp: !region.support.buy,
        is_unsupported_offramp: !region.support.sell,
      });

      setSelectedRegion(region);
      sheetRef.current?.onCloseBottomSheet();
    },
    [setSelectedRegion, trackEvent, regionInTransit, scrollToTop, isBuy],
  );

  const renderRegionItem = useCallback(
    ({ item: region }: { item: Region }) => {
      if (!region) return null;

      return (
        <ListItemSelect
          isSelected={
            selectedRegion?.id === region.id ||
            (selectedRegion?.id.includes('-') &&
              selectedRegion.id.split('-')[0] === region.id)
          }
          onPress={() => handleOnRegionPressCallback(region)}
          accessibilityRole="button"
          accessible
        >
          <ListItemColumn widthType={WidthType.Fill}>
            <View style={styles.region}>
              <View style={styles.emoji}>
                <Text variant={TextVariant.BodyLGMedium}>{region.emoji}</Text>
              </View>
              <View>
                <Text variant={TextVariant.BodyLGMedium}>{region.name}</Text>
              </View>
            </View>
          </ListItemColumn>
          {region.states && region.states.length > 0 && (
            <ListItemColumn>
              <Icon name={IconName.ArrowRight} />
            </ListItemColumn>
          )}
        </ListItemSelect>
      );
    },
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

  const handleRegionBackButton = useCallback(() => {
    setActiveView(RegionViewType.COUNTRY);
    setCurrentData(regions || []);
    setRegionInTransit(null);
    setSearchString('');
    scrollToTop();
  }, [regions, scrollToTop]);

  const onBackButtonPress = useCallback(() => {
    if (activeView === RegionViewType.STATE) {
      handleRegionBackButton();
    } else {
      sheetRef.current?.onCloseBottomSheet();
    }
  }, [activeView, handleRegionBackButton]);

  const onModalHide = useCallback(() => {
    setActiveView(RegionViewType.COUNTRY);
    setRegionInTransit(null);
    setCurrentData(regions || []);
    setSearchString('');
  }, [regions]);

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack
      onClose={onModalHide}
      keyboardAvoidingViewEnabled={false}
    >
      <HeaderCenter
        title={
          activeView === RegionViewType.COUNTRY
            ? strings('fiat_on_ramp_aggregator.region.title')
            : regionInTransit?.name
        }
        onClose={onBackButtonPress}
        onBack={
          activeView === RegionViewType.STATE
            ? handleRegionBackButton
            : undefined
        }
        backButtonProps={
          activeView === RegionViewType.STATE
            ? {
                testID: 'back-button',
              }
            : undefined
        }
      />
      <View style={styles.description}>
        <Text variant={TextVariant.BodyXS} color={TextColor.Muted}>
          {strings(
            isBuy
              ? 'fiat_on_ramp_aggregator.region.description'
              : 'fiat_on_ramp_aggregator.region.sell_description',
          )}
        </Text>
      </View>
      <View style={styles.searchContainer}>
        <TextFieldSearch
          value={searchString}
          showClearButton={searchString.length > 0}
          onPressClearButton={clearSearchText}
          onFocus={scrollToTop}
          onChangeText={handleSearchTextChange}
          placeholder={strings(
            activeView === RegionViewType.COUNTRY
              ? 'fiat_on_ramp_aggregator.region.search_by_country'
              : 'fiat_on_ramp_aggregator.region.search_by_state',
          )}
        />
      </View>
      <FlatList
        ref={listRef}
        style={styles.list}
        data={dataSearchResults}
        renderItem={renderRegionItem}
        extraData={selectedRegion?.id}
        keyExtractor={(item) => item?.id}
        ListEmptyComponent={renderEmptyList}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="always"
      />
    </BottomSheet>
  );
}

export default RegionSelectorModal;

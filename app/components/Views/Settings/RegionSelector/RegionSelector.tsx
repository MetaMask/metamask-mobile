import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from '@react-navigation/native';
import Fuse from 'fuse.js';

import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import ListItemSelect from '../../../../component-library/components/List/ListItemSelect';
import ListItemColumn, {
  WidthType,
} from '../../../../component-library/components/List/ListItemColumn';
import TextFieldSearch from '../../../../component-library/components/Form/TextFieldSearch';
import Icon, {
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../component-library/components/Buttons/ButtonIcon';

import styleSheet, {
  styles as navigationOptionsStyles,
} from './RegionSelector.styles';
import { useStyles } from '../../../hooks/useStyles';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import { strings } from '../../../../../locales/i18n';
import { useAppTheme } from '../../../../util/theme';
import { Country, State } from '@metamask/ramps-controller';
import { selectUserRegion } from '../../../../selectors/rampsController';
import { useSelector } from 'react-redux';
import useRampsRegions from '../hooks/useRampsRegions';
import { useRampsUserRegion } from '../../../../components/UI/Ramp/hooks/useRampsUserRegion';

const MAX_REGION_RESULTS = 20;

enum RegionViewType {
  COUNTRY = 'COUNTRY',
  STATE = 'STATE',
}

type RegionItem = Country | State;

function isCountry(region: RegionItem): region is Country {
  return 'isoCode' in region;
}

function isState(region: RegionItem): region is State {
  return !('isoCode' in region);
}

function RegionSelector() {
  const navigation = useNavigation();
  const { colors } = useAppTheme();
  const listRef = useRef<FlatList<RegionItem>>(null);

  const userRegion = useSelector(selectUserRegion);
  const { regions } = useRampsRegions();
  const [searchString, setSearchString] = useState('');
  const [activeView, setActiveView] = useState(RegionViewType.COUNTRY);
  const [currentData, setCurrentData] = useState<RegionItem[]>(regions || []);
  const [regionInTransit, setRegionInTransit] = useState<Country | null>(null);
  const { styles } = useStyles(styleSheet, {});
  const { setUserRegion } = useRampsUserRegion();

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        activeView === RegionViewType.COUNTRY
          ? strings('fiat_on_ramp_aggregator.region.title')
          : regionInTransit?.name ||
              strings('fiat_on_ramp_aggregator.region.title'),
        navigation,
        false,
        colors,
      ),
    );
  }, [colors, navigation, activeView, regionInTransit]);

  useEffect(() => {
    if (regions && activeView === RegionViewType.COUNTRY) {
      setCurrentData(regions);
    }
  }, [regions, activeView]);

  const fuseData = useMemo(() => {
    const flatRegions: RegionItem[] = currentData.reduce(
      (acc: RegionItem[], region: RegionItem) => {
        if (isCountry(region) && region.states) {
          return [...acc, region, ...region.states];
        }
        return [...acc, region];
      },
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

      const mappedResults: RegionItem[] =
        (results?.map((result) =>
          'item' in result ? result.item : result,
        ) as RegionItem[]) ?? [];

      return mappedResults;
    }

    if (!currentData.length) return [];

    return [...currentData].sort((a, b) => {
      const aRecommended = a.recommended ?? false;
      const bRecommended = b.recommended ?? false;
      if (aRecommended && !bRecommended) return -1;
      if (!aRecommended && bRecommended) return 1;
      return 0;
    });
  }, [searchString, fuseData, currentData]);

  const scrollToTop = useCallback(() => {
    listRef.current?.scrollToOffset({
      animated: false,
      offset: 0,
    });
  }, []);

  const getRegionId = useCallback((region: RegionItem): string => {
    if (isCountry(region)) {
      return region.isoCode.toLowerCase();
    }
    if (isState(region) && region.stateId) {
      return region.stateId.toLowerCase();
    }
    return '';
  }, []);

  const isRegionSelected = useCallback(
    (region: RegionItem): boolean => {
      if (!userRegion) return false;
      const regionId = getRegionId(region);
      return userRegion.regionCode === regionId;
    },
    [userRegion, getRegionId],
  );

  const handleOnRegionPressCallback = useCallback(
    async (region: RegionItem) => {
      if (isCountry(region) && region.states && region.states.length > 0) {
        setActiveView(RegionViewType.STATE);
        setRegionInTransit(region);
        setCurrentData(region.states);
        setSearchString('');
        scrollToTop();
        return;
      }

      const regionId = getRegionId(region);
      if (regionId) {
        try {
          await setUserRegion(regionId);
        } catch (error) {
          // Error is handled by controller state
        }
      }

      navigation.goBack();
    },
    [getRegionId, scrollToTop, navigation, setUserRegion],
  );

  const renderRegionItem = useCallback(
    ({ item: region }: { item: RegionItem }) => {
      const isSelected = isRegionSelected(region);

      if (isCountry(region)) {
        const isSupported = region.supported !== false;
        const showStateName =
          userRegion?.state &&
          activeView === RegionViewType.COUNTRY &&
          userRegion.country.isoCode.toLowerCase() ===
            region.isoCode.toLowerCase() &&
          userRegion.state.name;

        return (
          <ListItemSelect
            isSelected={isSelected}
            onPress={() => handleOnRegionPressCallback(region)}
            accessibilityRole="button"
            accessible
            disabled={!isSupported}
          >
            <ListItemColumn widthType={WidthType.Fill}>
              <View style={styles.region}>
                {region.flag && (
                  <View style={styles.emoji}>
                    <Text
                      variant={TextVariant.BodyLGMedium}
                      color={
                        isSupported ? TextColor.Default : TextColor.Alternative
                      }
                    >
                      {region.flag}
                    </Text>
                  </View>
                )}
                <View style={styles.textContainer}>
                  <Text
                    variant={TextVariant.BodyLGMedium}
                    color={
                      isSupported ? TextColor.Default : TextColor.Alternative
                    }
                  >
                    {region.name}
                  </Text>
                  {showStateName && userRegion.state && (
                    <Text variant={TextVariant.BodyMD} color={TextColor.Muted}>
                      {userRegion.state.name}
                    </Text>
                  )}
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
      }

      return (
        <ListItemSelect
          isSelected={isSelected}
          onPress={() => handleOnRegionPressCallback(region)}
          accessibilityRole="button"
          accessible
          disabled={!region.supported}
        >
          <ListItemColumn widthType={WidthType.Fill}>
            <View style={styles.region}>
              <View style={styles.textContainer}>
                <Text
                  variant={TextVariant.BodyLGMedium}
                  color={
                    region.supported ? TextColor.Default : TextColor.Alternative
                  }
                >
                  {region.name || ''}
                </Text>
              </View>
            </View>
          </ListItemColumn>
        </ListItemSelect>
      );
    },
    [
      handleOnRegionPressCallback,
      isRegionSelected,
      styles.region,
      styles.emoji,
      styles.textContainer,
      userRegion,
      activeView,
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

  const handleRegionBackButton = useCallback(() => {
    setActiveView(RegionViewType.COUNTRY);
    setCurrentData(regions || []);
    setRegionInTransit(null);
    setSearchString('');
    scrollToTop();
  }, [regions, scrollToTop]);

  useEffect(() => {
    if (activeView === RegionViewType.STATE) {
      navigation.setOptions({
        headerLeft: () => (
          <ButtonIcon
            size={ButtonIconSizes.Lg}
            iconName={IconName.ArrowLeft}
            onPress={handleRegionBackButton}
            style={navigationOptionsStyles.headerLeft}
            testID="back-button"
          />
        ),
      });
    } else {
      navigation.setOptions({
        headerLeft: () => (
          <ButtonIcon
            size={ButtonIconSizes.Lg}
            iconName={IconName.ArrowLeft}
            onPress={() => navigation.goBack()}
            style={navigationOptionsStyles.headerLeft}
          />
        ),
      });
    }
  }, [activeView, navigation, handleRegionBackButton]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.searchContainer}>
        {activeView === RegionViewType.COUNTRY && (
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Alternative}
            style={styles.descriptionText}
          >
            {strings('fiat_on_ramp_aggregator.region.region_variation_notice')}
          </Text>
        )}
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
        extraData={userRegion}
        keyExtractor={(item, index) => {
          if (isCountry(item)) {
            return item.isoCode;
          }
          if (isState(item) && item.stateId && regionInTransit) {
            return `${regionInTransit.isoCode}-${item.stateId}`;
          }
          return `region-${index}`;
        }}
        ListEmptyComponent={renderEmptyList}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="always"
      />
    </KeyboardAvoidingView>
  );
}

RegionSelector.navigationOptions = ({
  navigation,
}: {
  navigation: NavigationProp<ParamListBase>;
}) => ({
  headerLeft: () => (
    <ButtonIcon
      size={ButtonIconSizes.Lg}
      iconName={IconName.ArrowLeft}
      onPress={() => navigation.goBack()}
      style={navigationOptionsStyles.headerLeft}
    />
  ),
});

export default RegionSelector;

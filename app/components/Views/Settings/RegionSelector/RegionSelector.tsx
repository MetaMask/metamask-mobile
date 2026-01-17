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

interface GroupedSearchResult {
  country: Country;
  matchingStates: State[];
  countryMatches: boolean;
}

type ListItem = RegionItem | GroupedSearchResult;

function isCountry(region: RegionItem): region is Country {
  return 'isoCode' in region;
}

function isState(region: RegionItem): region is State {
  return !('isoCode' in region);
}

function isGroupedResult(item: ListItem): item is GroupedSearchResult {
  return 'country' in item && 'matchingStates' in item;
}

interface HeaderBackButtonProps {
  onPress: () => void;
  testID?: string;
}

function HeaderBackButton({ onPress, testID }: HeaderBackButtonProps) {
  return (
    <ButtonIcon
      size={ButtonIconSizes.Lg}
      iconName={IconName.ArrowLeft}
      onPress={onPress}
      style={navigationOptionsStyles.headerLeft}
      testID={testID}
    />
  );
}

function RegionSelector() {
  const navigation = useNavigation();
  const { colors } = useAppTheme();
  const listRef = useRef<FlatList<ListItem>>(null);

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

      const countriesMap = new Map<string, GroupedSearchResult>();
      const standaloneCountries: Country[] = [];
      const standaloneStates: State[] = [];
      const processedStateIds = new Set<string>();

      mappedResults.forEach((item) => {
        if (isCountry(item)) {
          if (item.states && item.states.length > 0) {
            countriesMap.set(item.isoCode, {
              country: item,
              matchingStates: [],
              countryMatches: true,
            });
          } else {
            standaloneCountries.push(item);
          }
        } else if (isState(item)) {
          const country = currentData.find(
            (c) =>
              isCountry(c) && c.states?.some((s) => s.stateId === item.stateId),
          ) as Country | undefined;

          if (country) {
            const existing = countriesMap.get(country.isoCode);
            if (existing) {
              existing.matchingStates.push(item);
            } else {
              countriesMap.set(country.isoCode, {
                country,
                matchingStates: [item],
                countryMatches: false,
              });
            }
            if (item.stateId) {
              processedStateIds.add(item.stateId);
            }
          } else {
            standaloneStates.push(item);
          }
        }
      });

      const groupedResults: ListItem[] = [
        ...Array.from(countriesMap.values()),
        ...standaloneCountries,
        ...standaloneStates.filter(
          (state) => !state.stateId || !processedStateIds.has(state.stateId),
        ),
      ];

      return groupedResults;
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
    ({ item }: { item: ListItem }) => {
      if (isGroupedResult(item)) {
        const countryIsSelected = isRegionSelected(item.country);
        const isSupported = item.country.supported !== false;
        const showStateName =
          userRegion?.state &&
          activeView === RegionViewType.COUNTRY &&
          userRegion.country.isoCode.toLowerCase() ===
            item.country.isoCode.toLowerCase() &&
          userRegion.state.name;

        return (
          <View>
            <ListItemSelect
              isSelected={countryIsSelected}
              onPress={() => handleOnRegionPressCallback(item.country)}
              accessibilityRole="button"
              accessible
              disabled={!isSupported}
            >
              <ListItemColumn widthType={WidthType.Fill}>
                <View style={styles.region}>
                  {item.country.flag && (
                    <View style={styles.emoji}>
                      <Text
                        variant={TextVariant.BodyLGMedium}
                        color={
                          isSupported
                            ? TextColor.Default
                            : TextColor.Alternative
                        }
                      >
                        {item.country.flag}
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
                      {item.country.name}
                    </Text>
                    {showStateName && userRegion.state && (
                      <Text
                        variant={TextVariant.BodyMD}
                        color={TextColor.Muted}
                      >
                        {userRegion.state.name}
                      </Text>
                    )}
                  </View>
                </View>
              </ListItemColumn>
              {item.country.states && item.country.states.length > 0 && (
                <ListItemColumn>
                  <Icon name={IconName.ArrowRight} />
                </ListItemColumn>
              )}
            </ListItemSelect>
            {item.matchingStates.map((state) => {
              const stateIsSelected = isRegionSelected(state);
              return (
                <ListItemSelect
                  key={state.stateId || state.name}
                  isSelected={stateIsSelected}
                  onPress={() => handleOnRegionPressCallback(state)}
                  accessibilityRole="button"
                  accessible
                  disabled={!state.supported}
                  style={styles.nestedStateItem}
                >
                  <ListItemColumn widthType={WidthType.Fill}>
                    <View style={[styles.region, styles.nestedStateRegion]}>
                      <View style={styles.textContainer}>
                        <Text
                          variant={TextVariant.BodyLGMedium}
                          color={
                            state.supported
                              ? TextColor.Default
                              : TextColor.Alternative
                          }
                        >
                          {state.name || ''}
                        </Text>
                      </View>
                    </View>
                  </ListItemColumn>
                </ListItemSelect>
              );
            })}
          </View>
        );
      }

      const region = item as RegionItem;
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
      styles.nestedStateItem,
      styles.nestedStateRegion,
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

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const stateHeaderLeft = useCallback(
    () => (
      <HeaderBackButton onPress={handleRegionBackButton} testID="back-button" />
    ),
    [handleRegionBackButton],
  );

  const defaultHeaderLeft = useCallback(
    () => <HeaderBackButton onPress={handleGoBack} />,
    [handleGoBack],
  );

  useEffect(() => {
    if (activeView === RegionViewType.STATE) {
      navigation.setOptions({
        headerLeft: stateHeaderLeft,
      });
    } else {
      navigation.setOptions({
        headerLeft: defaultHeaderLeft,
      });
    }
  }, [activeView, navigation, stateHeaderLeft, defaultHeaderLeft]);

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
          if (isGroupedResult(item)) {
            return `grouped-${item.country.isoCode}-${index}`;
          }
          if (isCountry(item)) {
            return item.isoCode;
          }
          if (isState(item) && item.stateId && regionInTransit) {
            return `${regionInTransit.isoCode}-${item.stateId}`;
          }
          if (isState(item) && item.stateId) {
            return item.stateId;
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

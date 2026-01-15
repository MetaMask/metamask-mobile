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
import Engine from '../../../../core/Engine';
import { Country, State } from '@metamask/ramps-controller';
import { selectUserRegion } from '../../../../selectors/rampsController';
import { useSelector } from 'react-redux';
import useRampsRegions from '../hooks/useRampsRegions';

const MAX_REGION_RESULTS = 20;

enum RegionViewType {
  COUNTRY = 'COUNTRY',
  STATE = 'STATE',
}

type RegionItem = Country | State;

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
        if ('states' in region && region.states) {
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
        results
          ?.map((result) =>
            typeof result === 'object' && result !== null && 'item' in result
              ? result.item
              : result,
          )
          .filter((item): item is RegionItem => Boolean(item)) || [];

      return mappedResults;
    }

    if (!currentData?.length) return [];

    return [...currentData].sort((a, b) => {
      if (
        'recommended' in a &&
        a.recommended &&
        !('recommended' in b && b.recommended)
      )
        return -1;
      if (
        !('recommended' in a && a.recommended) &&
        'recommended' in b &&
        b.recommended
      )
        return 1;
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

  const getRegionId = useCallback(
    (region: RegionItem): string => {
      if ('isoCode' in region && region.isoCode) {
        return region.isoCode.toLowerCase();
      }
      if ('id' in region && region.id) {
        const id = region.id.toLowerCase();
        if (id.startsWith('/regions/')) {
          return id.replace('/regions/', '').replace(/\//g, '-');
        }
        return id;
      }
      if ('stateId' in region && region.stateId && regionInTransit) {
        if (regionInTransit.isoCode) {
          return `${regionInTransit.isoCode.toLowerCase()}-${region.stateId.toLowerCase()}`;
        }
        if (regionInTransit.id) {
          const countryId = regionInTransit.id.toLowerCase();
          if (countryId.startsWith('/regions/')) {
            const countryCode = countryId
              .replace('/regions/', '')
              .split('/')[0];
            return `${countryCode}-${region.stateId.toLowerCase()}`;
          }
        }
      }
      return '';
    },
    [regionInTransit],
  );

  const isRegionSelected = useCallback(
    (region: RegionItem): boolean => {
      if (!userRegion) return false;
      const regionId = getRegionId(region);
      const normalizedUserRegion = userRegion.toLowerCase();
      const normalizedRegionId = regionId.toLowerCase();

      if (normalizedUserRegion === normalizedRegionId) {
        return true;
      }

      if (
        normalizedUserRegion.includes('-') &&
        normalizedRegionId.includes('-')
      ) {
        const userParts = normalizedUserRegion.split('-');
        const regionParts = normalizedRegionId.split('-');
        if (userParts.length === 2 && regionParts.length === 2) {
          return (
            userParts[0] === regionParts[0] && userParts[1] === regionParts[1]
          );
        }
      }

      if (
        'isoCode' in region &&
        region.isoCode &&
        normalizedUserRegion.startsWith(region.isoCode.toLowerCase())
      ) {
        return true;
      }

      return false;
    },
    [userRegion, getRegionId],
  );

  const handleOnRegionPressCallback = useCallback(
    async (region: RegionItem) => {
      if ('states' in region && region.states && region.states.length > 0) {
        setActiveView(RegionViewType.STATE);
        setRegionInTransit(region as Country);
        setCurrentData(region.states);
        setSearchString('');
        scrollToTop();
        return;
      }

      const regionId = getRegionId(region);
      if (regionId) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (Engine.context.RampsController as any).setUserRegion(regionId);
        } catch (error) {
          // Error is handled by controller state
        }
      }

      navigation.goBack();
    },
    [getRegionId, scrollToTop, navigation],
  );

  const renderRegionItem = useCallback(
    ({ item: region }: { item: RegionItem }) => {
      if (!region) return null;

      const isSelected = isRegionSelected(region);
      const isSupported =
        'supported' in region ? region.supported !== false : true;
      const hasStates =
        'states' in region && region.states && region.states.length > 0;
      const regionName = 'name' in region ? region.name : '';
      const regionFlag: string =
        ('flag' in region && typeof region.flag === 'string' && region.flag) ||
        ('emoji' in region &&
          typeof region.emoji === 'string' &&
          region.emoji) ||
        '';

      let stateName: string | null = null;
      if (
        'isoCode' in region &&
        userRegion &&
        userRegion.includes('-') &&
        activeView === RegionViewType.COUNTRY
      ) {
        const regionParts = userRegion.toLowerCase().split('-');
        const countryCode = regionParts[0];
        const stateCode = regionParts[1];

        if (
          (region.isoCode?.toLowerCase() === countryCode ||
            (region.id?.toLowerCase().startsWith(`/regions/${countryCode}`))) &&
          stateCode &&
          region.states
        ) {
          const state = region.states.find((s) => {
            if (s.stateId?.toLowerCase() === stateCode) {
              return true;
            }
            if (s.id) {
              const stateId = s.id.toLowerCase();
              if (
                stateId.includes(`-${stateCode}`) ||
                stateId.endsWith(`/${stateCode}`)
              ) {
                return true;
              }
            }
            return false;
          });
          if (state?.name) {
            stateName = state.name;
          }
        }
      }

      const showStateName = Boolean(stateName);

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
              {regionFlag && (
                <View style={styles.emoji}>
                  <Text
                    variant={TextVariant.BodyLGMedium}
                    color={
                      isSupported ? TextColor.Default : TextColor.Alternative
                    }
                  >
                    {regionFlag}
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
                  {regionName}
                </Text>
                {showStateName && (
                  <Text variant={TextVariant.BodyMD} color={TextColor.Muted}>
                    {stateName}
                  </Text>
                )}
              </View>
            </View>
          </ListItemColumn>
          {hasStates && (
            <ListItemColumn>
              <Icon name={IconName.ArrowRight} />
            </ListItemColumn>
          )}
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
          if ('isoCode' in item) {
            return item.isoCode;
          }
          if ('id' in item && item.id) {
            return item.id;
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

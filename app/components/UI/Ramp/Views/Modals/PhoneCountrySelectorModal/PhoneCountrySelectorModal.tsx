import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import Fuse from 'fuse.js';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetRef,
  FontWeight,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { Country } from '@metamask/ramps-controller';
import ListItemSelect from '../../../../../../component-library/components/List/ListItemSelect';
import ListItemColumn, {
  WidthType,
} from '../../../../../../component-library/components/List/ListItemColumn';
import TextFieldSearch from '../../../../../../component-library/components/Form/TextFieldSearch';
import { useStyles } from '../../../../../hooks/useStyles';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import { useElevatedSurface } from '../../../../../../util/theme/themeUtils';
import styleSheet from '../../../Deposit/Views/Modals/RegionSelectorModal/RegionSelectorModal.styles';

const MAX_COUNTRY_RESULTS = 20;

function getCountrySearchResultItem(
  result: Country | { item?: Country },
): Country {
  return 'item' in result && result.item ? result.item : (result as Country);
}

export interface PhoneCountrySelectorModalParams {
  countries: Country[];
  selectedCountry?: Country | null;
  onCountrySelect: (country: Country) => void;
}

export const createPhoneCountrySelectorModalNavigationDetails =
  createNavigationDetails<PhoneCountrySelectorModalParams>(
    Routes.RAMP.MODALS.ID,
    Routes.RAMP.MODALS.PHONE_COUNTRY_SELECTOR,
  );

function PhoneCountrySelectorModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const listRef = useRef<FlatList<Country>>(null);
  const navigation = useNavigation();
  const { countries, selectedCountry, onCountrySelect } =
    useParams<PhoneCountrySelectorModalParams>();
  const [searchString, setSearchString] = useState('');
  const { height: screenHeight } = useWindowDimensions();
  const { styles } = useStyles(styleSheet, {
    screenHeight,
  });
  const surfaceClass = useElevatedSurface();

  const countriesWithPhoneData = useMemo(
    () => countries.filter((country) => country.phone),
    [countries],
  );

  const fuseData = useMemo(
    () =>
      new Fuse(countriesWithPhoneData, {
        shouldSort: true,
        threshold: 0.2,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: ['name', 'isoCode', 'phone.prefix'],
      }),
    [countriesWithPhoneData],
  );

  const dataSearchResults = useMemo(() => {
    if (searchString.length > 0) {
      return fuseData
        .search(searchString)
        .slice(0, MAX_COUNTRY_RESULTS)
        .map(getCountrySearchResultItem);
    }

    return [...countriesWithPhoneData].sort((a, b) => {
      const aRecommended = a.recommended ?? false;
      const bRecommended = b.recommended ?? false;
      if (aRecommended && !bRecommended) return -1;
      if (!aRecommended && bRecommended) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [searchString, fuseData, countriesWithPhoneData]);

  const scrollToTop = useCallback(() => {
    listRef.current?.scrollToOffset({
      animated: false,
      offset: 0,
    });
  }, []);

  const handleCountryPress = useCallback(
    (country: Country) => {
      onCountrySelect(country);
      sheetRef.current?.onCloseBottomSheet();
    },
    [onCountrySelect],
  );

  const renderCountryItem = useCallback(
    ({ item: country }: { item: Country }) => (
      <ListItemSelect
        isSelected={selectedCountry?.isoCode === country.isoCode}
        onPress={() => handleCountryPress(country)}
        accessibilityRole="button"
        accessible
      >
        <ListItemColumn widthType={WidthType.Fill}>
          <View style={styles.region}>
            {country.flag ? (
              <View style={styles.emoji}>
                <Text
                  variant={TextVariant.BodyLg}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextDefault}
                >
                  {country.flag}
                </Text>
              </View>
            ) : null}
            <View>
              <Text
                variant={TextVariant.BodyLg}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
              >
                {country.name}
              </Text>
              {country.phone?.prefix ? (
                <Text variant={TextVariant.BodyMd} color={TextColor.TextMuted}>
                  {country.phone.prefix}
                </Text>
              ) : null}
            </View>
          </View>
        </ListItemColumn>
      </ListItemSelect>
    ),
    [handleCountryPress, selectedCountry?.isoCode, styles.emoji, styles.region],
  );

  const renderEmptyList = useCallback(
    () => (
      <View style={styles.emptyList}>
        <Text variant={TextVariant.BodyLg} fontWeight={FontWeight.Medium}>
          {strings('deposit.phone_country_modal.no_countries_found', {
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
    <BottomSheet
      ref={sheetRef}
      goBack={navigation.goBack}
      twClassName={surfaceClass}
    >
      <HeaderStandard
        title={strings('deposit.phone_country_modal.select_phone_country')}
        onClose={() => sheetRef.current?.onCloseBottomSheet()}
      />
      <View style={styles.searchContainer}>
        <TextFieldSearch
          value={searchString}
          onPressClearButton={clearSearchText}
          onFocus={scrollToTop}
          onChangeText={handleSearchTextChange}
          placeholder={strings('deposit.phone_country_modal.search_by_country')}
        />
      </View>
      <FlatList
        ref={listRef}
        style={styles.list}
        data={dataSearchResults}
        renderItem={renderCountryItem}
        extraData={selectedCountry?.isoCode}
        keyExtractor={(item) => item.isoCode}
        ListEmptyComponent={renderEmptyList}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="always"
      />
    </BottomSheet>
  );
}

export default PhoneCountrySelectorModal;

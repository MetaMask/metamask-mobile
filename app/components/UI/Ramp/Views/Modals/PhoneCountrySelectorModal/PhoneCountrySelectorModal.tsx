import React, { useCallback, useMemo, useRef } from 'react';
import { ListRenderItem, View } from 'react-native';
import Fuse from 'fuse.js';
import {
  BottomSheetRef,
  FontWeight,
  ListItemSelect,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { Country } from '@metamask/ramps-controller';
import ListItemColumn, {
  WidthType,
} from '../../../../../../component-library/components/List/ListItemColumn';
import { useStyles } from '../../../../../hooks/useStyles';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import SearchableSelectorBottomSheet from '../../../components/SearchableSelectorBottomSheet';
import styleSheet from './PhoneCountrySelectorModal.styles';

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
  const { countries, selectedCountry, onCountrySelect } =
    useParams<PhoneCountrySelectorModalParams>();
  const { styles } = useStyles(styleSheet, {});

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

  const getResults = useCallback(
    (searchString: string) => {
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
    },
    [fuseData, countriesWithPhoneData],
  );

  const handleCountryPress = useCallback(
    (country: Country) => {
      onCountrySelect(country);
      sheetRef.current?.onCloseBottomSheet();
    },
    [onCountrySelect],
  );

  const renderCountryItem = useCallback<ListRenderItem<Country>>(
    ({ item }) => (
      <ListItemSelect
        isSelected={selectedCountry?.isoCode === item.isoCode}
        onPress={() => handleCountryPress(item)}
        accessibilityRole="button"
        accessible
      >
        <ListItemColumn widthType={WidthType.Fill}>
          <View style={styles.region}>
            {item.flag ? (
              <View style={styles.emoji}>
                <Text
                  variant={TextVariant.BodyLg}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextDefault}
                >
                  {item.flag}
                </Text>
              </View>
            ) : null}
            <View>
              <Text
                variant={TextVariant.BodyLg}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
              >
                {item.name}
              </Text>
              {item.phone?.prefix ? (
                <Text variant={TextVariant.BodyMd} color={TextColor.TextMuted}>
                  {item.phone.prefix}
                </Text>
              ) : null}
            </View>
          </View>
        </ListItemColumn>
      </ListItemSelect>
    ),
    [handleCountryPress, selectedCountry?.isoCode, styles.emoji, styles.region],
  );

  return (
    <SearchableSelectorBottomSheet<Country>
      sheetRef={sheetRef}
      title={strings('deposit.phone_country_modal.select_phone_country')}
      searchPlaceholder={strings(
        'deposit.phone_country_modal.search_by_country',
      )}
      noResultsText={(searchString) =>
        strings('deposit.phone_country_modal.no_countries_found', {
          searchString,
        })
      }
      getResults={getResults}
      renderItem={renderCountryItem}
      keyExtractor={(item) => item.isoCode}
      extraData={selectedCountry?.isoCode}
    />
  );
}

export default PhoneCountrySelectorModal;

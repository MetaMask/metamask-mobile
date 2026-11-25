import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useWindowDimensions, type ListRenderItem } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  FontWeight,
  ListItemSelect,
  Text,
  TextColor,
  TextFieldSearch,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../locales/i18n';
import { getPhoneNumberEntryTestIds } from './PhoneNumberEntry.testIds';
import {
  DEFAULT_PHONE_COUNTRY_ISO,
  PHONE_COUNTRIES,
  getCountryFlag,
  getDialPrefix,
  type PhoneCountry,
} from './phone';

interface CountrySheetProps {
  selected: PhoneCountry;
  onSelect: (country: PhoneCountry) => void;
  onClose: () => void;
  testIdPrefix: string;
}

// The default country first, then A to Z.
const SORTED_COUNTRIES = [...PHONE_COUNTRIES].sort(
  (first, second) =>
    Number(second.iso === DEFAULT_PHONE_COUNTRY_ISO) -
      Number(first.iso === DEFAULT_PHONE_COUNTRY_ISO) ||
    first.name.localeCompare(second.name),
);

/** A search matches a country's name, ISO code or calling code. */
const filterCountries = (searchString: string): PhoneCountry[] => {
  const query = searchString.trim().toLowerCase().replace(/^\+/u, '');
  if (!query) {
    return SORTED_COUNTRIES;
  }
  return SORTED_COUNTRIES.filter(
    (country) =>
      country.name.toLowerCase().includes(query) ||
      country.iso.toLowerCase() === query ||
      country.callingCode.startsWith(query) ||
      (country.areaCodes?.some((areaCode) => areaCode.startsWith(query)) ??
        false),
  );
};

/**
 * The country code picker: a bottom sheet with a search field and the
 * countries, the selected one highlighted. Closing it only calls `onClose`; it
 * never navigates, as it opens over the screen rather than being a route.
 */
const CountrySheet = ({
  selected,
  onSelect,
  onClose,
  testIdPrefix,
}: CountrySheetProps) => {
  const tw = useTailwind();
  const { height: screenHeight } = useWindowDimensions();
  const ids = getPhoneNumberEntryTestIds(testIdPrefix);
  const sheetRef = useRef<BottomSheetRef>(null);
  const listRef = useRef<FlatList<PhoneCountry>>(null);
  const [searchString, setSearchString] = useState('');
  const countries = useMemo(
    () => filterCountries(searchString),
    [searchString],
  );

  const search = useCallback((text: string) => {
    setSearchString(text);
    listRef.current?.scrollToOffset({ animated: false, offset: 0 });
  }, []);

  const renderItem = useCallback<ListRenderItem<PhoneCountry>>(
    ({ item }) => (
      <ListItemSelect
        isSelected={item.iso === selected.iso}
        onPress={() => {
          onSelect(item);
          sheetRef.current?.onCloseBottomSheet();
        }}
        accessibilityRole="button"
        accessible
        testID={getPhoneNumberEntryTestIds(testIdPrefix).COUNTRY_OPTION(
          item.iso,
        )}
        startAccessory={
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {getCountryFlag(item.iso)}
          </Text>
        }
        title={item.name}
        titleProps={{ variant: TextVariant.BodyMd }}
        description={getDialPrefix(item)}
        descriptionProps={{
          variant: TextVariant.BodySm,
          fontWeight: FontWeight.Regular,
          color: TextColor.TextMuted,
        }}
      />
    ),
    [onSelect, selected.iso, testIdPrefix],
  );

  return (
    <BottomSheet ref={sheetRef} onClose={onClose} testID={ids.COUNTRY_SHEET}>
      <BottomSheetHeader onClose={() => sheetRef.current?.onCloseBottomSheet()}>
        {strings('mfa.phone_entry.country_picker_title')}
      </BottomSheetHeader>
      <Box twClassName="px-4 py-3">
        <TextFieldSearch
          value={searchString}
          onChangeText={search}
          onPressClearButton={() => search('')}
          placeholder={strings('mfa.phone_entry.country_search_placeholder')}
          inputAccessibilityLabel={strings(
            'mfa.phone_entry.country_search_placeholder',
          )}
        />
      </Box>
      <FlatList
        ref={listRef}
        style={tw.style({ maxHeight: screenHeight * 0.4 })}
        data={countries}
        renderItem={renderItem}
        extraData={selected.iso}
        keyExtractor={(item) => item.iso}
        ListEmptyComponent={
          <Box twClassName="items-center p-4">
            <Text variant={TextVariant.BodyLg} fontWeight={FontWeight.Medium}>
              {strings('mfa.phone_entry.country_no_results', { searchString })}
            </Text>
          </Box>
        }
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="always"
      />
    </BottomSheet>
  );
};

export default CountrySheet;

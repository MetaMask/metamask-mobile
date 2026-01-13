import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import Fuse from 'fuse.js';
import { strings } from '../../../../../../../locales/i18n';
import { FiatCurrency } from '@consensys/on-ramp-sdk';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { useRampSDK } from '../../sdk';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import HeaderCenter from '../../../../../../component-library/components-temp/HeaderCenter';
import TextFieldSearch from '../../../../../../component-library/components/Form/TextFieldSearch';
import ListItemSelect from '../../../../../../component-library/components/List/ListItemSelect';
import ListItemColumn, {
  WidthType,
} from '../../../../../../component-library/components/List/ListItemColumn';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './FiatSelectorModal.styles.ts';

const MAX_RESULTS = 20;

interface FiatSelectorModalNavigationDetails {
  currencies: FiatCurrency[];
}

export const createFiatSelectorModalNavigationDetails =
  createNavigationDetails<FiatSelectorModalNavigationDetails>(
    Routes.RAMP.MODALS.ID,
    Routes.RAMP.MODALS.FIAT_SELECTOR,
  );

function FiatSelectorModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const listRef = useRef<FlatList<FiatCurrency>>(null);

  const { currencies } = useParams<FiatSelectorModalNavigationDetails>();
  const [searchString, setSearchString] = useState('');

  const { height: screenHeight } = useWindowDimensions();
  const { styles } = useStyles(styleSheet, {
    screenHeight,
  });
  const { setSelectedFiatCurrencyId, selectedFiatCurrencyId } = useRampSDK();

  const currencyFuse = useMemo(
    () =>
      new Fuse(currencies, {
        shouldSort: true,
        threshold: 0.45,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: ['symbol', 'name'],
      }),
    [currencies],
  );
  const currencySearchResults = useMemo(
    () =>
      searchString.length > 0
        ? currencyFuse.search(searchString)?.slice(0, MAX_RESULTS) || []
        : currencies || [],
    [searchString, currencyFuse, currencies],
  );

  const handleSelectCurrency = useCallback(
    (currency: FiatCurrency) => {
      setSelectedFiatCurrencyId(currency?.id);
      sheetRef.current?.onCloseBottomSheet();
    },
    [setSelectedFiatCurrencyId],
  );

  const renderItem = useCallback(
    ({ item }: { item: FiatCurrency }) => (
      <ListItemSelect
        onPress={() => handleSelectCurrency(item)}
        isSelected={selectedFiatCurrencyId === item.id}
        accessibilityRole="button"
        accessible
      >
        <ListItemColumn widthType={WidthType.Fill}>
          <Text variant={TextVariant.BodyLGMedium}>{item.name}</Text>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {item.symbol}
          </Text>
        </ListItemColumn>
      </ListItemSelect>
    ),
    [handleSelectCurrency, selectedFiatCurrencyId],
  );

  const scrollToTop = useCallback(() => {
    if (listRef?.current) {
      listRef?.current.scrollToOffset({
        animated: false,
        offset: 0,
      });
    }
  }, []);

  const handleSearchTextChange = useCallback(
    (text: string) => {
      setSearchString(text);
      scrollToTop();
    },
    [scrollToTop],
  );

  const clearSearchText = useCallback(() => {
    handleSearchTextChange('');
  }, [handleSearchTextChange]);

  const renderEmptyList = useCallback(
    () => (
      <ListItemSelect isSelected={false} isDisabled>
        <Text variant={TextVariant.BodyLGMedium}>
          {strings('fiat_on_ramp_aggregator.no_currency_match', {
            searchString,
          })}
        </Text>
      </ListItemSelect>
    ),
    [searchString],
  );

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack>
      <HeaderCenter
        title={strings('fiat_on_ramp_aggregator.select_region_currency')}
        onClose={() => sheetRef.current?.onCloseBottomSheet()}
      />
      <View style={styles.searchContainer}>
        <TextFieldSearch
          value={searchString}
          showClearButton={searchString.length > 0}
          onPressClearButton={clearSearchText}
          onFocus={scrollToTop}
          onChangeText={handleSearchTextChange}
          placeholder={strings('fiat_on_ramp_aggregator.search_by_currency')}
        />
      </View>
      <FlatList
        style={styles.list}
        ref={listRef}
        data={currencySearchResults}
        extraData={selectedFiatCurrencyId}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyList}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="always"
      />
    </BottomSheet>
  );
}

export default FiatSelectorModal;

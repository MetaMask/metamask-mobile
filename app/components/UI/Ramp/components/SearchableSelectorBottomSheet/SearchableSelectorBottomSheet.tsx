import React, {
  ComponentProps,
  RefObject,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ListRenderItem, View, useWindowDimensions } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetRef,
  FontWeight,
  HeaderStandard,
  Text,
  TextFieldSearch,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './SearchableSelectorBottomSheet.styles';

export interface SearchableSelectorBottomSheetProps<T> {
  /**
   * Ref to the underlying BottomSheet, owned by the parent so it can close the
   * sheet from its own selection logic.
   */
  sheetRef: RefObject<BottomSheetRef | null>;
  title: string;
  searchPlaceholder: string;
  /**
   * Builds the "no results" message for the current search term.
   */
  noResultsText: (searchString: string) => string;
  /**
   * Returns the list items for the current search term. Owns the type-specific
   * filtering/sorting (e.g. Fuse search).
   */
  getResults: (searchString: string) => T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T) => string;
  extraData?: unknown;
  closeButtonProps?: ComponentProps<typeof HeaderStandard>['closeButtonProps'];
}

function SearchableSelectorBottomSheet<T>({
  sheetRef,
  title,
  searchPlaceholder,
  noResultsText,
  getResults,
  renderItem,
  keyExtractor,
  extraData,
  closeButtonProps,
}: Readonly<SearchableSelectorBottomSheetProps<T>>) {
  const listRef = useRef<FlatList<T>>(null);
  const navigation = useNavigation();
  const [searchString, setSearchString] = useState('');
  const { height: screenHeight } = useWindowDimensions();
  const { styles } = useStyles(styleSheet, { screenHeight });

  const data = useMemo(
    () => getResults(searchString),
    [getResults, searchString],
  );

  const scrollToTop = useCallback(() => {
    listRef.current?.scrollToOffset({ animated: false, offset: 0 });
  }, []);

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

  const renderEmptyList = useCallback(
    () => (
      <View style={styles.emptyList}>
        <Text variant={TextVariant.BodyLg} fontWeight={FontWeight.Medium}>
          {noResultsText(searchString)}
        </Text>
      </View>
    ),
    [noResultsText, searchString, styles.emptyList],
  );

  return (
    <BottomSheet ref={sheetRef} goBack={navigation.goBack}>
      <HeaderStandard
        title={title}
        onClose={() => sheetRef.current?.onCloseBottomSheet()}
        closeButtonProps={closeButtonProps}
      />
      <View style={styles.searchContainer}>
        <TextFieldSearch
          value={searchString}
          onPressClearButton={clearSearchText}
          onFocus={scrollToTop}
          onChangeText={handleSearchTextChange}
          placeholder={searchPlaceholder}
          clearButtonProps={{ testID: 'searchable-selector-clear-button' }}
        />
      </View>
      <FlatList
        ref={listRef}
        style={styles.list}
        data={data}
        renderItem={renderItem}
        extraData={extraData}
        keyExtractor={keyExtractor}
        ListEmptyComponent={renderEmptyList}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="always"
      />
    </BottomSheet>
  );
}

export default SearchableSelectorBottomSheet;

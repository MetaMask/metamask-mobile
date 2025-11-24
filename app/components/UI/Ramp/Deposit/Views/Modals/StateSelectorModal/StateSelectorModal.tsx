import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import Fuse from 'fuse.js';
import { useNavigation } from '@react-navigation/native';

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

import styleSheet from './StateSelectorModal.styles';
import { useStyles } from '../../../../../../hooks/useStyles';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../../util/navigation/navUtils';
import { US_STATES } from '../../../constants';
import Routes from '../../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../../locales/i18n';
import { createUnsupportedStateModalNavigationDetails } from '../UnsupportedStateModal/UnsupportedStateModal';

const MAX_STATE_RESULTS = 20;

export interface StateSelectorModalParams {
  selectedState?: string;
  onStateSelect: (stateCode: string) => void;
}

export const createStateSelectorModalNavigationDetails =
  createNavigationDetails<StateSelectorModalParams>(
    Routes.DEPOSIT.MODALS.ID,
    Routes.DEPOSIT.MODALS.STATE_SELECTOR,
  );

function StateSelectorModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const listRef = useRef<FlatList<{ code: string; name: string }>>(null);
  const navigation = useNavigation();
  const { selectedState, onStateSelect } =
    useParams<StateSelectorModalParams>();
  const [searchString, setSearchString] = useState('');
  const { height: screenHeight } = useWindowDimensions();
  const { styles } = useStyles(styleSheet, {
    screenHeight,
  });

  const fuseData = useMemo(
    () =>
      new Fuse(US_STATES, {
        shouldSort: true,
        threshold: 0.2,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: ['name', 'code'],
      }),
    [],
  );

  const dataSearchResults = useMemo(() => {
    if (searchString.length > 0) {
      const results = fuseData
        .search(searchString)
        ?.slice(0, MAX_STATE_RESULTS);
      return results || [];
    }

    return [...US_STATES].sort((a, b) => a.name.localeCompare(b.name));
  }, [searchString, fuseData]);

  const scrollToTop = useCallback(() => {
    if (listRef?.current) {
      listRef.current.scrollToOffset({
        animated: false,
        offset: 0,
      });
    }
  }, []);

  const handleOnStatePressCallback = useCallback(
    (state: { code: string; name: string }) => {
      if (state.code === 'NY') {
        sheetRef.current?.onCloseBottomSheet(() => {
          navigation.navigate(
            ...createUnsupportedStateModalNavigationDetails({
              stateCode: state.code,
              stateName: state.name,
              onStateSelect,
            }),
          );
        });
      } else {
        onStateSelect(state.code);
        sheetRef.current?.onCloseBottomSheet();
      }
    },
    [navigation, onStateSelect],
  );

  const renderStateItem = useCallback(
    ({ item: state }: { item: { code: string; name: string } }) => (
      <ListItemSelect
        isSelected={selectedState === state.code}
        onPress={() => handleOnStatePressCallback(state)}
        accessibilityRole="button"
        accessible
      >
        <ListItemColumn widthType={WidthType.Fill}>
          <View style={styles.state}>
            <Text variant={TextVariant.BodyLGMedium} color={TextColor.Default}>
              {state.name}
            </Text>
          </View>
        </ListItemColumn>
      </ListItemSelect>
    ),
    [handleOnStatePressCallback, selectedState, styles.state],
  );

  const renderEmptyList = useCallback(
    () => (
      <View style={styles.emptyList}>
        <Text variant={TextVariant.BodyLGMedium}>
          {strings('deposit.state_modal.no_state_results', {
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
    <BottomSheet ref={sheetRef} shouldNavigateBack>
      <BottomSheetHeader onClose={() => sheetRef.current?.onCloseBottomSheet()}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('deposit.state_modal.select_a_state')}
        </Text>
      </BottomSheetHeader>
      <View style={styles.searchContainer}>
        <TextFieldSearch
          value={searchString}
          showClearButton={searchString.length > 0}
          onPressClearButton={clearSearchText}
          onFocus={scrollToTop}
          onChangeText={handleSearchTextChange}
          placeholder={strings('deposit.state_modal.search_by_state')}
        />
      </View>
      <FlatList
        ref={listRef}
        style={styles.list}
        data={dataSearchResults}
        renderItem={renderStateItem}
        extraData={selectedState}
        keyExtractor={(item) => item.code}
        ListEmptyComponent={renderEmptyList}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="always"
      />
    </BottomSheet>
  );
}

export default StateSelectorModal;

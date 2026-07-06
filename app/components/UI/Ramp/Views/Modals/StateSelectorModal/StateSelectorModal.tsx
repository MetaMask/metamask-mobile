import React, { useCallback, useMemo, useRef } from 'react';
import { ListRenderItem, View } from 'react-native';
import Fuse from 'fuse.js';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheetRef,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import ListItemSelect from '../../../../../../component-library/components/List/ListItemSelect';
import ListItemColumn, {
  WidthType,
} from '../../../../../../component-library/components/List/ListItemColumn';

import styleSheet from './StateSelectorModal.styles';
import { useStyles } from '../../../../../hooks/useStyles';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import { US_STATES } from '../../../constants';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import { createUnsupportedStateModalNavigationDetails } from '../UnsupportedStateModal/UnsupportedStateModal';
import SearchableSelectorBottomSheet from '../../../components/SearchableSelectorBottomSheet';

const MAX_STATE_RESULTS = 20;

interface UsState {
  code: string;
  name: string;
}

export interface StateSelectorModalParams {
  selectedState?: string;
  onStateSelect: (stateCode: string) => void;
}

export const createStateSelectorModalNavigationDetails =
  createNavigationDetails<StateSelectorModalParams>(
    Routes.RAMP.MODALS.ID,
    Routes.RAMP.MODALS.STATE_SELECTOR,
  );

function StateSelectorModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { selectedState, onStateSelect } =
    useParams<StateSelectorModalParams>();
  const { styles } = useStyles(styleSheet, {});

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

  const getResults = useCallback(
    (searchString: string): UsState[] => {
      if (searchString.length > 0) {
        return fuseData.search(searchString)?.slice(0, MAX_STATE_RESULTS) || [];
      }

      return [...US_STATES].sort((a, b) => a.name.localeCompare(b.name));
    },
    [fuseData],
  );

  const handleOnStatePressCallback = useCallback(
    (state: UsState) => {
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

  const renderStateItem = useCallback<ListRenderItem<UsState>>(
    ({ item }) => (
      <ListItemSelect
        isSelected={selectedState === item.code}
        onPress={() => handleOnStatePressCallback(item)}
        accessibilityRole="button"
        accessible
      >
        <ListItemColumn widthType={WidthType.Fill}>
          <View style={styles.state}>
            <Text
              variant={TextVariant.BodyLg}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
            >
              {item.name}
            </Text>
          </View>
        </ListItemColumn>
      </ListItemSelect>
    ),
    [handleOnStatePressCallback, selectedState, styles.state],
  );

  return (
    <SearchableSelectorBottomSheet<UsState>
      sheetRef={sheetRef}
      title={strings('deposit.state_modal.select_a_state')}
      searchPlaceholder={strings('deposit.state_modal.search_by_state')}
      noResultsText={(searchString) =>
        strings('deposit.state_modal.no_state_results', { searchString })
      }
      getResults={getResults}
      renderItem={renderStateItem}
      keyExtractor={(item) => item.code}
      extraData={selectedState}
      closeButtonProps={{ testID: 'state-selector-close-button' }}
    />
  );
}

export default StateSelectorModal;

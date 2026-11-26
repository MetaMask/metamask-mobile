import React, { useCallback, useRef } from 'react';
import { ListRenderItem } from 'react-native';
import {
  BottomSheetRef,
  ListItemSelect,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import SearchableSelectorBottomSheet from '../../../components/SearchableSelectorBottomSheet';

export interface SelectorOption {
  name: string;
  value: string;
}

export interface OptionSelectorModalParams {
  title: string;
  options: SelectorOption[];
  selectedValue?: string;
  onSelect: (value: string) => void;
}

export const createOptionSelectorModalNavigationDetails =
  createNavigationDetails<OptionSelectorModalParams>(
    Routes.RAMP.MODALS.ID,
    Routes.RAMP.MODALS.OPTION_SELECTOR,
  );

/**
 * Searchable bottom sheet that lists a set of options and reports the chosen
 * value. Used by the option select fields (e.g. source of funds, employment
 * status, nationality).
 */
function OptionSelectorModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { title, options, selectedValue, onSelect } =
    useParams<OptionSelectorModalParams>();

  const getResults = useCallback(
    (searchString: string) => {
      const query = searchString.trim().toLowerCase();
      if (!query) {
        return options;
      }
      return options.filter((option) =>
        option.name.toLowerCase().includes(query),
      );
    },
    [options],
  );

  const handleSelect = useCallback(
    (value: string) => {
      onSelect(value);
      sheetRef.current?.onCloseBottomSheet();
    },
    [onSelect],
  );

  const renderItem = useCallback<ListRenderItem<SelectorOption>>(
    ({ item }) => (
      <ListItemSelect
        isSelected={selectedValue === item.value}
        onPress={() => handleSelect(item.value)}
        accessibilityRole="button"
        accessibilityLabel={item.name}
        testID={`option-selector-item-${item.value}`}
      >
        <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
          {item.name}
        </Text>
      </ListItemSelect>
    ),
    [handleSelect, selectedValue],
  );

  return (
    <SearchableSelectorBottomSheet<SelectorOption>
      sheetRef={sheetRef}
      title={title}
      searchPlaceholder={strings('deposit.option_selector_modal.search')}
      noResultsText={(searchString) =>
        strings('deposit.option_selector_modal.no_results', { searchString })
      }
      getResults={getResults}
      renderItem={renderItem}
      keyExtractor={(item) => item.value}
      extraData={selectedValue}
      closeButtonProps={{ testID: 'option-selector-close-button' }}
    />
  );
}

export default OptionSelectorModal;

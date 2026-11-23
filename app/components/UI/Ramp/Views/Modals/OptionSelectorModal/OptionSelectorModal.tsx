import React, { useCallback, useMemo, useRef } from 'react';
import { ListRenderItem, useWindowDimensions } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  BottomSheet,
  BottomSheetRef,
  ListItemSelect,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import HeaderStandardGlass from '../../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../../selectors/featureFlagController/glassHeaders';

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
 * Bottom sheet that lists a short set of options and reports the chosen value.
 * Used by the MiCA questionnaire pickers (source of funds, employment status,
 * nationality).
 */
function OptionSelectorModal() {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled);
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const { title, options, selectedValue, onSelect } =
    useParams<OptionSelectorModalParams>();
  const { height: screenHeight } = useWindowDimensions();
  const listStyle = useMemo(
    () => ({ maxHeight: screenHeight * 0.5 }),
    [screenHeight],
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
    <BottomSheet ref={sheetRef} goBack={navigation.goBack}>
      <HeaderStandardGlass
        isFloating={false}
        isGlass={isGlassHeader}
        title={title}
        onClose={() => sheetRef.current?.onCloseBottomSheet()}
        closeButtonProps={{ testID: 'option-selector-close-button' }}
      />
      <FlatList
        style={listStyle}
        data={options}
        renderItem={renderItem}
        extraData={selectedValue}
        keyExtractor={(item) => item.value}
      />
    </BottomSheet>
  );
}

export default OptionSelectorModal;

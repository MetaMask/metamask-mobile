import React, { useCallback, useRef } from 'react';
import { ListRenderItem, useWindowDimensions } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import {
  BottomSheet,
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
import HeaderStandardGlass from '../../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../../selectors/featureFlagController/glassHeaders';
import { useStyles } from '../../../../../hooks/useStyles';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import styleSheet from './OptionSelectorModal.styles';

export interface SelectOption {
  name: string;
  value: string;
}

export interface OptionSelectorModalParams {
  title: string;
  options: SelectOption[];
  selectedValue?: string;
  onSelect: (value: string) => void;
}

export const OPTION_SELECTOR_CLOSE_BUTTON_TEST_ID =
  'option-selector-close-button';

export const createOptionSelectorModalNavigationDetails =
  createNavigationDetails<OptionSelectorModalParams>(
    Routes.RAMP.MODALS.ID,
    Routes.RAMP.MODALS.OPTION_SELECTOR,
  );

function OptionSelectorModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const { title, options, selectedValue, onSelect } =
    useParams<OptionSelectorModalParams>();
  const { height: screenHeight } = useWindowDimensions();
  const { styles } = useStyles(styleSheet, { screenHeight });

  const handleSelect = useCallback(
    (option: SelectOption) => {
      onSelect(option.value);
      sheetRef.current?.onCloseBottomSheet();
    },
    [onSelect],
  );

  const renderItem = useCallback<ListRenderItem<SelectOption>>(
    ({ item }) => (
      <ListItemSelect
        isSelected={selectedValue === item.value}
        onPress={() => handleSelect(item)}
        accessibilityRole="button"
        accessible
      >
        <ListItemColumn widthType={WidthType.Fill}>
          <Text
            variant={TextVariant.BodyLg}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
          >
            {item.name}
          </Text>
        </ListItemColumn>
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
        closeButtonProps={{ testID: OPTION_SELECTOR_CLOSE_BUTTON_TEST_ID }}
      />
      <FlatList
        style={styles.list}
        data={options}
        renderItem={renderItem}
        extraData={selectedValue}
        keyExtractor={(item) => item.value}
      />
    </BottomSheet>
  );
}

export default OptionSelectorModal;

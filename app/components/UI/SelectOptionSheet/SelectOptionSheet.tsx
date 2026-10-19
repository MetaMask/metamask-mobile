import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import {
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../util/theme';
import createStyles from './styles';
import { ISelectOptionSheet } from './types';
import { createOptionsSheetNavDetails } from './OptionsSheet';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { navigateWithDetails } from '../../../util/navigation/navUtils';
import { SELECT_DROP_DOWN } from './constants';

const SelectOptionSheet = ({
  defaultValue,
  label,
  selectedValue,
  options,
  onValueChange,
}: ISelectOptionSheet) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation<AppNavigationProp>();

  const renderDisplayValue = () => {
    const selectedOptions = options?.filter((o) => o.value === selectedValue);
    if (selectedOptions.length > 0) {
      return selectedOptions[0].label;
    }
    if (defaultValue) {
      return defaultValue;
    }
    return '';
  };

  const showPicker = () => {
    navigateWithDetails(
      navigation,
      createOptionsSheetNavDetails({
        label,
        options,
        selectedValue,
        onValueChange,
      }),
    );
  };

  return (
    <TouchableOpacity onPress={showPicker} testID={SELECT_DROP_DOWN}>
      <View style={styles.dropdown}>
        <Text style={styles.selectedOption} numberOfLines={1}>
          {renderDisplayValue()}
        </Text>
        <Icon
          name={IconName.ArrowDown}
          size={IconSize.Xs}
          color={IconColor.IconAlternative}
          twClassName="mr-2"
        />
      </View>
    </TouchableOpacity>
  );
};

export default SelectOptionSheet;

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { baseStyles } from '../../../styles/common';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../../util/theme';
import createStyles from './styles';
import { ISelectOptionSheet } from './types';
import { useNavigation } from '@react-navigation/native';
import { SELECT_DROP_DOWN } from './constants';
import type { NavigatableRootParamList } from '../../../util/navigation';
import type { StackNavigationProp } from '@react-navigation/stack';

const SelectOptionSheet = ({
  defaultValue,
  label,
  selectedValue,
  options,
  onValueChange,
}: ISelectOptionSheet) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation =
    useNavigation<StackNavigationProp<NavigatableRootParamList>>();

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
    navigation.navigate('OptionsSheet', {
      label,
      options,
      selectedValue,
      onValueChange,
    });
  };

  return (
    <View style={baseStyles.flexGrow}>
      <TouchableOpacity onPress={showPicker} testID={SELECT_DROP_DOWN}>
        <View style={styles.dropdown}>
          <Text style={styles.selectedOption} numberOfLines={1}>
            {renderDisplayValue()}
          </Text>
          <Icon
            name={'arrow-drop-down'}
            size={24}
            color={colors.icon.default}
            style={styles.iconDropdown}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default SelectOptionSheet;

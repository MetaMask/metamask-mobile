import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { baseStyles } from '../../../styles/common';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../../util/theme';
import createStyles from './styles';
import { iSelectOptionSheet } from './types';
import { createOptionsSheetNavDetails } from './OptionsSheet';
import { useNavigation } from '@react-navigation/native';
import { SELECT_DROP_DOWN } from './constants';

const SelectOptionSheet = ({
  defaultValue,
  label,
  selectedValue,
  options,
  onValueChange,
}: iSelectOptionSheet) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();

  const getSelectedValue = () => {
    const el = options?.filter((o) => o.value === selectedValue);
    if (el.length > 0) {
      return el[0].label;
    }
    if (defaultValue) {
      return defaultValue;
    }
    return '';
  };

  const showPicker = () => {
    navigation.navigate(
      ...createOptionsSheetNavDetails({
        label,
        options,
        selectedValue,
        onValueChange,
      }),
    );
  };

  return (
    <View style={baseStyles.flexGrow}>
      <TouchableOpacity onPress={showPicker} testID={SELECT_DROP_DOWN}>
        <View style={styles.dropdown}>
          <Text style={styles.selectedOption} numberOfLines={1}>
            {getSelectedValue()}
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

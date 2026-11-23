/**
 * DepositSelectField
 *
 * A labelled picker for deposit forms: a design system `SelectButton` that
 * opens the option selector bottom sheet (e.g. source of funds, employment
 * status, nationality).
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Label,
  SelectButton,
  SelectButtonSize,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { navigateWithDetails } from '../../../../../util/navigation/navUtils';
import { useStyles } from '../../../../hooks/useStyles';
import Text from '../../../../../component-library/components/Texts/Text';
import { Theme } from '../../../../../util/theme/models';
import { createOptionSelectorModalNavigationDetails } from '../../Views/Modals/OptionSelectorModal';

interface DepositSelectFieldProps {
  label: string;
  placeholder?: string;
  options: { name: string; value: string }[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    label: {
      marginBottom: 8,
    },
    error: {
      color: theme.colors.error.default,
      fontSize: 12,
      marginTop: 4,
    },
  });
};

const DepositSelectField: React.FC<DepositSelectFieldProps> = ({
  label,
  placeholder = 'Select an option',
  options,
  selectedValue,
  onValueChange,
  error,
  containerStyle,
  testID,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { styles } = useStyles(styleSheet, {});

  const selectedOption = options.find((opt) => opt.value === selectedValue);

  const handlePress = useCallback(() => {
    navigateWithDetails(
      navigation,
      createOptionSelectorModalNavigationDetails({
        title: label,
        options,
        selectedValue,
        onSelect: onValueChange,
      }),
    );
  }, [navigation, label, options, selectedValue, onValueChange]);

  return (
    <View style={containerStyle}>
      <Label style={styles.label}>{label}</Label>
      <SelectButton
        size={SelectButtonSize.Lg}
        placeholder={placeholder}
        value={selectedOption?.name}
        onPress={handlePress}
        isFullWidth
        accessibilityLabel={label}
        testID={testID}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

export default DepositSelectField;

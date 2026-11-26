/**
 * OptionSelectField
 *
 * A labelled picker for native flow forms: a design system `SelectButton` that
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
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../../../core/NavigationService/types';
import { navigateWithDetails } from '../../../../../../../util/navigation/navUtils';
import { useStyles } from '../../../../../../hooks/useStyles';
import { createOptionSelectorModalNavigationDetails } from '../../../Modals/OptionSelectorModal';

export interface OptionSelectFieldProps {
  label: string;
  placeholder?: string;
  options: { name: string; value: string }[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

const styleSheet = () =>
  StyleSheet.create({
    label: {
      marginBottom: 8,
    },
    error: {
      marginTop: 4,
    },
  });

const OptionSelectField: React.FC<OptionSelectFieldProps> = ({
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
      {error ? (
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.ErrorDefault}
          style={styles.error}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
};

export default OptionSelectField;

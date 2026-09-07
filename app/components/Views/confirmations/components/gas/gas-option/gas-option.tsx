import React from 'react';
import { View, TouchableOpacity } from 'react-native';

import { useStyles } from '../../../../../../component-library/hooks';
import { type GasOption as GasOptionType } from '../../../types/gas';
import styleSheet from './gas-option.styles';
import {
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';

export const GasOption = ({ option }: { option: GasOptionType }) => {
  const { onSelect, name, estimatedTime, valueInFiat, value, isSelected, key } =
    option;

  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.optionWrapper}>
      {isSelected && (
        <View style={styles.selectionIndicator} testID="selection-indicator" />
      )}
      <TouchableOpacity
        testID={`gas-option-${key}`}
        style={[styles.optionContainer, isSelected && styles.selectedOption]}
        onPress={() => onSelect()}
      >
        <View style={styles.leftSection}>
          <View style={styles.optionTextContainer}>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              style={styles.optionName}
            >
              {name}
            </Text>
            {estimatedTime && (
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                style={styles.estimatedTime}
              >
                {estimatedTime}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.rightSection}>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            style={styles.valueInFiat}
          >
            {valueInFiat}
          </Text>
          {!!value && (
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              style={styles.value}
            >
              {value}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

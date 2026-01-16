import React from 'react';
import { View } from 'react-native';
import TouchableOpacity from '../../../../../Base/TouchableOpacity';

import { useStyles } from '../../../../../../component-library/hooks';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { type GasOption as GasOptionType } from '../../../types/gas';
import styleSheet from './gas-option.styles';

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
            <Text variant={TextVariant.BodyMDMedium} style={styles.optionName}>
              {name}
            </Text>
            {estimatedTime && (
              <Text
                variant={TextVariant.BodySMMedium}
                style={styles.estimatedTime}
              >
                {estimatedTime}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.rightSection}>
          <Text variant={TextVariant.BodyMDMedium} style={styles.valueInFiat}>
            {valueInFiat}
          </Text>
          {!!value && (
            <Text variant={TextVariant.BodySMMedium} style={styles.value}>
              {value}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

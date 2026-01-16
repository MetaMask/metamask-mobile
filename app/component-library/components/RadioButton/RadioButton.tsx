/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import TouchableOpacity from '../../../components/Base/TouchableOpacity';
import { useStyles } from '../../hooks';
import Text from '../Texts/Text/Text';

// Internal dependencies.
import { RadioButtonProps } from './RadioButton.types';
import styleSheet from './RadioButton.styles';
import {
  RADIOBUTTON_ICON_TESTID,
  DEFAULT_RADIOBUTTON_LABEL_TEXTVARIANT,
  DEFAULT_RADIOBUTTON_LABEL_TEXTCOLOR,
} from './RadioButton.constants';

const RadioButton = ({
  style,
  label,
  isChecked = false,
  isDisabled = false,
  isReadOnly = false,
  isDanger = false,
  ...props
}: RadioButtonProps) => {
  const { styles } = useStyles(styleSheet, {
    style,
    isChecked,
    isDisabled,
    isReadOnly,
    isDanger,
  });

  return (
    <TouchableOpacity
      style={styles.base}
      {...props}
      disabled={isDisabled || isReadOnly}
    >
      <View style={styles.radioButton} accessibilityRole="radio">
        {isChecked && (
          <View style={styles.icon} testID={RADIOBUTTON_ICON_TESTID} />
        )}
      </View>
      {label && (
        <View style={styles.label}>
          {typeof label === 'string' ? (
            <Text
              variant={DEFAULT_RADIOBUTTON_LABEL_TEXTVARIANT}
              color={DEFAULT_RADIOBUTTON_LABEL_TEXTCOLOR}
            >
              {label}
            </Text>
          ) : (
            label
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

export default RadioButton;

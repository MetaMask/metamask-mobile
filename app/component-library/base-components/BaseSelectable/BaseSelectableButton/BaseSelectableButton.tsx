/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View, TouchableOpacity } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import Text from '../../../components/Texts/Text';

// Internal dependencies.
import styleSheet from './BaseSelectableButton.styles';
import { BaseSelectableButtonProps } from './BaseSelectableButton.types';
import {
  DEFAULT_BASESELECTABLEBUTTON_PLACEHOLDER_STRING,
  BASESELECTABLEBUTTON_TESTID,
  BASESELECTABLEBUTTON_PLACEHOLDER_TESTID,
} from './BaseSelectableButton.constants';

const BaseSelectableButton: React.FC<BaseSelectableButtonProps> = ({
  style,
  children,
  caretIconEl,
  isDisabled,
  placeholder = DEFAULT_BASESELECTABLEBUTTON_PLACEHOLDER_STRING,
  ...touchableOpacityProps
}) => {
  const { styles } = useStyles(styleSheet, { style });
  return (
    <TouchableOpacity
      style={styles.base}
      testID={BASESELECTABLEBUTTON_TESTID}
      {...touchableOpacityProps}
      disabled={isDisabled}
      accessibilityRole="button"
    >
      <View style={styles.value}>
        {children || (
          <Text testID={BASESELECTABLEBUTTON_PLACEHOLDER_TESTID}>
            {placeholder}
          </Text>
        )}
      </View>
      {caretIconEl && caretIconEl}
    </TouchableOpacity>
  );
};

export default BaseSelectableButton;

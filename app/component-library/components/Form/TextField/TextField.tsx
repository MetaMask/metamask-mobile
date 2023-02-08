/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useState } from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import Input from './foundation/Input';
import { TextVariant } from '../../Texts/Text';

// Internal dependencies.
import styleSheet from './TextField.styles';
import { TextFieldProps } from './TextField.types';
import { DEFAULT_TEXTFIELD_SIZE } from './TextField.constants';

const TextField: React.FC<TextFieldProps> = ({
  style,
  size = DEFAULT_TEXTFIELD_SIZE,
  startAccessory,
  endAccessory,
  error = false,
  inputComponent,
  disabled = false,
  autoFocus = false,
  onBlur,
  onFocus,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(autoFocus);
  const { styles } = useStyles(styleSheet, {
    style,
    size,
    error,
    disabled,
    isFocused,
  });

  const onBlurHandler = (e: any) => {
    if (!disabled) {
      setIsFocused(false);
      onBlur?.(e);
    }
  };

  const onFocusHandler = (e: any) => {
    if (!disabled) {
      setIsFocused(true);
      onFocus?.(e);
    }
  };

  return (
    <View style={styles.base}>
      {startAccessory && (
        <View style={styles.startAccessory}>{startAccessory}</View>
      )}
      {inputComponent ? (
        { inputComponent }
      ) : (
        <Input
          disableStateStyles
          textVariant={TextVariant.BodyMD}
          disabled={disabled}
          autoFocus={autoFocus}
          onBlur={onBlurHandler}
          onFocus={onFocusHandler}
          {...props}
        />
      )}
      {endAccessory && <View style={styles.endAccessory}>{endAccessory}</View>}
    </View>
  );
};

export default TextField;

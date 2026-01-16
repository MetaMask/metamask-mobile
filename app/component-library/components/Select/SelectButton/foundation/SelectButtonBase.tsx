/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import TouchableOpacity from '../../../../../components/Base/TouchableOpacity';
import { useStyles } from '../../../../hooks';
import SelectValue from '../../SelectValue/SelectValue';

// Internal dependencies.
import styleSheet from './SelectButtonBase.styles';
import { SelectButtonBaseProps } from './SelectButtonBase.types';

const SelectButtonBase: React.FC<SelectButtonBaseProps> = ({
  style,
  iconEl,
  iconProps,
  label,
  description,
  startAccessory,
  children,
  endAccessory,
  gap,
  verticalAlignment,
  caretIconEl,
  isDisabled,
  ...touchableOpacityProps
}) => {
  const { styles } = useStyles(styleSheet, { style });
  return (
    <TouchableOpacity
      style={styles.base}
      activeOpacity={1}
      {...touchableOpacityProps}
      disabled={isDisabled}
      accessibilityRole="button"
    >
      <SelectValue
        style={styles.value}
        iconEl={iconEl}
        iconProps={iconProps}
        label={label}
        description={description}
        startAccessory={startAccessory}
        endAccessory={endAccessory}
        gap={gap}
        verticalAlignment={verticalAlignment}
      >
        {children}
      </SelectValue>
      <View>{caretIconEl}</View>
    </TouchableOpacity>
  );
};

export default SelectButtonBase;

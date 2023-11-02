/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View, TouchableOpacity } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../hooks';
import SelectValue from '../../SelectValue/SelectValue';

// Internal dependencies.
import styleSheet from './SelectButtonBase.styles';
import { SelectButtonBaseProps } from './SelectButtonBase.types';

const SelectButtonBase: React.FC<SelectButtonBaseProps> = ({
  style,
  iconEl,
  iconProps,
  title,
  description,
  startAccessory,
  children,
  endAccessory,
  gap,
  verticalAlignment,
  caretIcon,
  ...touchableOpacityProps
}) => {
  const { styles } = useStyles(styleSheet, { style });
  return (
    <TouchableOpacity
      style={styles.base}
      activeOpacity={1}
      {...touchableOpacityProps}
    >
      <SelectValue
        style={styles.value}
        iconEl={iconEl}
        iconProps={iconProps}
        title={title}
        description={description}
        startAccessory={startAccessory}
        endAccessory={endAccessory}
        gap={gap}
        verticalAlignment={verticalAlignment}
      >
        {children}
      </SelectValue>
      <View>{caretIcon}</View>
    </TouchableOpacity>
  );
};

export default SelectButtonBase;

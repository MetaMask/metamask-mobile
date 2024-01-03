/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View, TouchableOpacity } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../../hooks';
import ValueListItem from '../../../../../ValueList/ValueListItem/ValueListItem';
import { ValueListVariant } from '../../../../../ValueList/ValueList.types';

// Internal dependencies.
import styleSheet from './DropdownButtonBase.styles';
import { DropdownButtonBaseProps } from './DropdownButtonBase.types';

const DropdownButtonBase: React.FC<DropdownButtonBaseProps> = ({
  style,
  iconEl,
  iconProps,
  label,
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
      {...touchableOpacityProps}
      disabled={isDisabled}
      accessibilityRole="button"
    >
      <ValueListItem
        style={styles.value}
        iconEl={iconEl}
        iconProps={iconProps}
        label={label}
        startAccessory={startAccessory}
        endAccessory={endAccessory}
        gap={gap}
        verticalAlignment={verticalAlignment}
        variant={ValueListVariant.Display}
      >
        {children}
      </ValueListItem>
      <View>{caretIconEl}</View>
    </TouchableOpacity>
  );
};

export default DropdownButtonBase;

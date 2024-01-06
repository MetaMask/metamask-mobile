/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View, TouchableOpacity } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../hooks';
import ValueListItem from '../../../ValueList/ValueListItem/ValueListItem';
import { ValueListVariant } from '../../../ValueList/ValueList.types';

// Internal dependencies.
import styleSheet from './SelectableButton.styles';
import { SelectableButtonProps } from './SelectableButton.types';

const SelectableButton: React.FC<SelectableButtonProps> = ({
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
  SkinComponent,
  ...touchableOpacityProps
}) => {
  const { styles } = useStyles(styleSheet, { style });
  const RenderingComponent = SkinComponent || ValueListItem;
  return (
    <TouchableOpacity
      style={styles.base}
      {...touchableOpacityProps}
      disabled={isDisabled}
      accessibilityRole="button"
    >
      <RenderingComponent
        style={styles.value}
        iconEl={iconEl}
        iconProps={iconProps}
        label={label}
        description={description}
        startAccessory={startAccessory}
        endAccessory={endAccessory}
        gap={gap}
        verticalAlignment={verticalAlignment}
        variant={ValueListVariant.Display}
      >
        {children}
      </RenderingComponent>
      <View>{caretIconEl}</View>
    </TouchableOpacity>
  );
};

export default SelectableButton;

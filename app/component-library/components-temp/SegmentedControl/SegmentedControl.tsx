// Third party dependencies.
import React, { useCallback } from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../hooks';
import ButtonToggle from '../../components-temp/Buttons/ButtonToggle';

// Internal dependencies.
import { SegmentedControlProps } from './SegmentedControl.types';
import styleSheet from './SegmentedControl.styles';
import { DEFAULT_SEGMENTEDCONTROL_SIZE } from './SegmentedControl.constants';

const SegmentedControl = ({
  options,
  selectedValue,
  onValueChange,
  size = DEFAULT_SEGMENTEDCONTROL_SIZE,
  isDisabled = false,
  style,
  ...props
}: SegmentedControlProps) => {
  const { styles } = useStyles(styleSheet, {
    style,
    size,
  });

  const handlePress = useCallback(
    (value: string) => {
      onValueChange?.(value);
    },
    [onValueChange],
  );

  return (
    <View style={styles.base} {...props}>
      {options.map((option, index) => (
        <ButtonToggle
          key={option.value}
          label={option.label}
          isActive={selectedValue === option.value}
          onPress={() => handlePress(option.value)}
          size={size}
          isDisabled={isDisabled}
          style={[
            styles.button,
            index === options.length - 1 ? styles.lastButton : null,
          ]}
        />
      ))}
    </View>
  );
};

export default SegmentedControl;

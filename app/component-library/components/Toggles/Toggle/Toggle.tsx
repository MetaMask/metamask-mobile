/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useState } from 'react';
import { Switch } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';

// Internal dependencies.
import styleSheet from './Toggle.styles';
import { ToggleProps } from './Toggle.types';
import { TOGGLE_TEST_ID } from './Toggle.constants';

const Toggle: React.FC<ToggleProps> = ({
  style,
  isSelected = false,
  onValueChange,
  ...props
}) => {
  const [currentValue, setCurrentValue] = useState(isSelected);
  const { styles, theme } = useStyles(styleSheet, { style });

  const valueChangeHandler = () => {
    setCurrentValue(!currentValue);
    onValueChange?.(currentValue);
  };
  return (
    <Switch
      trackColor={{
        true: theme.colors.primary.default,
        // TODO: Replace Hex value with theme.colors.background.moderate when available
        false: '#848C96',
      }}
      style={styles.base}
      ios_backgroundColor={'#848C96'}
      {...props}
      value={currentValue}
      onValueChange={valueChangeHandler}
      testID={TOGGLE_TEST_ID}
    />
  );
};

export default Toggle;

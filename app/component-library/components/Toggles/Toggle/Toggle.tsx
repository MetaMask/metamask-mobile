/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useState } from 'react';
import { Switch } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';

// Internal dependencies.
import styleSheet from './Toggle.styles';
import { ToggleProps } from './Toggle.types';

const Toggle: React.FC<ToggleProps> = ({
  style,
  value = false,
  onValueChange,
  ...props
}) => {
  const [currentValue, setCurrentValue] = useState(value);
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
    />
  );
};

export default Toggle;

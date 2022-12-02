/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useMemo } from 'react';

// External dependencies.
import Icon, { IconNames, IconSize } from '../Icons/Icon';
import { useStyles } from '../../hooks';

// Internal dependencies.
import { CheckboxProps } from './Checkbox.types';
import { CHECKBOX_ICON_ID } from './Checkbox.constants';
import styleSheet from './Checkbox.styles';

const Checkbox = ({ style, isSelected, ...props }: CheckboxProps) => {
  const {
    styles,
    theme: { colors },
  } = useStyles(styleSheet, { style, isSelected });
  const iconName = useMemo(
    () => (isSelected ? IconNames.CheckBoxOn : IconNames.CheckBoxOff),
    [isSelected],
  );
  const iconColor = useMemo(
    () => (isSelected ? colors.primary.default : colors.icon.muted),
    [isSelected, colors],
  );

  return (
    <Icon
      testID={CHECKBOX_ICON_ID}
      name={iconName}
      size={IconSize.Lg}
      color={iconColor}
      style={styles.base}
      {...props}
    />
  );
};

export default Checkbox;

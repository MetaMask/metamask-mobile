/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../hooks';
import ListItemSelect from '../../List/ListItemSelect/ListItemSelect';
import SelectValue from '../SelectValue/SelectValue';

// Internal dependencies.
import styleSheet from './SelectOption.styles';
import { SelectOptionProps } from './SelectOption.types';

const SelectOption: React.FC<SelectOptionProps> = ({
  style,
  isSelected,
  isDisabled,
  gap = 12,
  verticalAlignment,
  hitSlop,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, {
    style,
  });

  return (
    <ListItemSelect
      style={styles.base}
      gap={gap}
      verticalAlignment={verticalAlignment}
      isSelected={isSelected}
      isDisabled={isDisabled}
      accessibilityRole="menuitem"
    >
      <SelectValue {...props} />
    </ListItemSelect>
  );
};

export default SelectOption;

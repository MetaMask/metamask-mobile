/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../hooks';
import SelectWrapper from './foundation/SelectWrapper/SelectWrapper';
import SelectableMenu from '../foundation/SelectableMenu/SelectableMenu';

// Internal dependencies.
import styleSheet from './Select.styles';
import { SelectProps } from './Select.types';

const Select: React.FC<SelectProps> = ({
  style,
  placeholder,
  value,
  selectButtonProps,
  bottomSheetProps,
  title,
  description,
  startAccessory,
  endAccessory,
  options,
  filterCallback,
  textFieldSearchProps,
  isSearchable,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style });
  return (
    <SelectWrapper
      style={styles.base}
      value={value}
      selectButtonProps={selectButtonProps}
      bottomSheetProps={bottomSheetProps}
      placeholder={placeholder}
      {...props}
    >
      <SelectableMenu
        title={title}
        description={description}
        startAccessory={startAccessory}
        endAccessory={endAccessory}
        options={options}
        filterCallback={filterCallback}
        textFieldSearchProps={textFieldSearchProps}
        isSearchable={isSearchable}
      />
    </SelectWrapper>
  );
};

export default Select;

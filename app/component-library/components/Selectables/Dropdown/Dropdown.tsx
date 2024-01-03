/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../hooks';
import DropdownWrapper from './foundation/DropdownWrapper/DropdownWrapper';
import SelectableMenu from '../foundation/SelectableMenu/SelectableMenu';

// Internal dependencies.
import styleSheet from './Dropdown.styles';
import { DropdownProps } from './Dropdown.types';

const Dropdown: React.FC<DropdownProps> = ({
  style,
  placeholder,
  value,
  dropdownButtonProps,
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
    <DropdownWrapper
      style={styles.base}
      value={value}
      dropdownButtonProps={dropdownButtonProps}
      bottomSheetProps={bottomSheetProps}
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
    </DropdownWrapper>
  );
};

export default Dropdown;

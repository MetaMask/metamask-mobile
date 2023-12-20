/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../hooks';
import SelectWrapper from './SelectWrapper/SelectWrapper';
import SelectMenu from './SelectMenu/SelectMenu';

// Internal dependencies.
import styleSheet from './Select.styles';
import { SelectProps } from './Select.types';

const Select: React.FC<SelectProps> = ({
  style,
  placeholder,
  value,
  selectButtonProps,
  isBottomSheetOpen,
  bottomSheetProps,
  title,
  description,
  startAccessory,
  endAccessory,
  options,
  filterCallback,
  textFieldSearchProps,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style });
  return (
    <SelectWrapper
      style={styles.base}
      value={value}
      selectButtonProps={selectButtonProps}
      isBottomSheetOpen={isBottomSheetOpen}
      bottomSheetProps={bottomSheetProps}
      {...props}
    >
      <SelectMenu
        title={title}
        description={description}
        startAccessory={startAccessory}
        endAccessory={endAccessory}
        options={options}
        filterCallback={filterCallback}
        textFieldSearchProps={textFieldSearchProps}
      />
    </SelectWrapper>
  );
};

export default Select;

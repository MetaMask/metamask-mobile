/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../hooks';
import SelectHeader from '../SelectHeader/SelectHeader';
import SelectOptionsList from '../SelectOptionsList/SelectOptionsList';

// Internal dependencies.
import styleSheet from './SelectMenu.styles';
import { SelectMenuProps } from './SelectMenu.types';
import SelectMenuBase from './foundation/SelectMenuBase';

const SelectMenu: React.FC<SelectMenuProps> = ({
  style,
  title,
  description,
  startAccessory,
  endAccessory,
  options,
  filterCallback,
  textFieldSearchProps,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, {
    style,
  });
  return (
    <SelectMenuBase
      style={styles.base}
      headerEl={
        <SelectHeader
          title={title}
          description={description}
          startAccessory={startAccessory}
          endAccessory={endAccessory}
        />
      }
      {...props}
    >
      <SelectOptionsList
        options={options}
        filterCallback={filterCallback}
        textFieldSearchProps={textFieldSearchProps}
      />
    </SelectMenuBase>
  );
};

export default SelectMenu;

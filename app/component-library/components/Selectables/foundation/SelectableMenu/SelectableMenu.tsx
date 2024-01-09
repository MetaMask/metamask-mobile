/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../../hooks';
import SelectableHeader from '../SelectableHeader/SelectableHeader';
import ValueList from '../../../ValueList/ValueList';

// Internal dependencies.
import styleSheet from './SelectableMenu.styles';
import { SelectableMenuProps } from './SelectableMenu.types';
import SelectableMenuBase from './foundation/SelectableMenuBase';

const SelectableMenu: React.FC<SelectableMenuProps> = ({
  style,
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
  const { styles } = useStyles(styleSheet, {
    style,
  });
  return (
    <SelectableMenuBase
      style={styles.base}
      headerEl={
        <SelectableHeader
          title={title}
          description={description}
          startAccessory={startAccessory}
          endAccessory={endAccessory}
        />
      }
      {...props}
    >
      <ValueList
        options={options}
        filterCallback={filterCallback}
        textFieldSearchProps={textFieldSearchProps}
        isSearchable={isSearchable}
      />
    </SelectableMenuBase>
  );
};

export default SelectableMenu;

/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import ListSearchable from '../../List/ListSearchable';
import { SelectOptionProps } from '../SelectOption/SelectOption.types';
import SelectOption from '../SelectOption/SelectOption';

// Internal dependencies.
import { SelectOptionsListProps } from './SelectOptionsList.types';

const SelectOptionsList: React.FC<SelectOptionsListProps> = ({
  options,
  filterCallback,
  ...props
}) => {
  const renderList = (searchText: string) => {
    const filterFlexibleText = (textProp: string | React.ReactNode) =>
      typeof textProp === 'string'
        ? textProp.toLowerCase().includes(searchText.toLowerCase())
        : false;

    const defaultFilterCb = (selectOptionProps: SelectOptionProps) =>
      filterFlexibleText(selectOptionProps.label) ||
      filterFlexibleText(selectOptionProps.description);

    const filterCb = filterCallback || defaultFilterCb;
    const filteredOptions = options?.length
      ? options.filter((optionProps) => filterCb(optionProps))
      : [];
    return (
      <>
        {filteredOptions.map((optionProps, index) => (
          <SelectOption key={index} {...optionProps} />
        ))}
      </>
    );
  };

  return <ListSearchable {...props} renderFilteredList={renderList} />;
};

export default SelectOptionsList;

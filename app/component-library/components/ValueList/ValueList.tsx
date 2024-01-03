/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import List from '../List/List';
import { ValueListItemProps } from './ValueListItem/ValueListItem.types';
import ValueListItem from './ValueListItem/ValueListItem';

// Internal dependencies.
import { ValueListProps } from './ValueList.types';
import { DEFAULT_VALUELIST_VARIANT } from './ValueList.constants';

const ValueList: React.FC<ValueListProps> = ({
  variant = DEFAULT_VALUELIST_VARIANT,
  options = [],
  filterCallback,
  isSearchable,
  ...props
}) => {
  const renderValueListItem = (valueOptions: ValueListItemProps[]) => (
    <>
      {valueOptions.map((optionProps, index) => (
        <ValueListItem key={index} variant={variant} {...optionProps} />
      ))}
    </>
  );

  const renderFilteredListCallback = (searchText: string) => {
    const filterFlexibleText = (textProp: string | React.ReactNode) =>
      typeof textProp === 'string'
        ? textProp.toLowerCase().includes(searchText.toLowerCase())
        : false;

    const defaultFilterCb = (valueListItemProps: ValueListItemProps) =>
      filterFlexibleText(valueListItemProps.label) ||
      filterFlexibleText(valueListItemProps.description);

    const filterCb = filterCallback || defaultFilterCb;
    const filteredOptions = options?.length
      ? options.filter((optionProps) => filterCb(optionProps))
      : [];
    return renderValueListItem(filteredOptions);
  };

  return isSearchable ? (
    <List
      renderFilteredListCallback={renderFilteredListCallback}
      isSearchable
      {...props}
    />
  ) : (
    <List isSearchable={false} {...props}>
      {renderValueListItem(options)}
    </List>
  );
};

export default ValueList;

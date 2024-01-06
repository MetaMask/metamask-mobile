/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useState } from 'react';
import { GestureResponderEvent } from 'react-native';

// External dependencies.
import List from '../List/List';
import { ValueListItemProps } from './ValueListItem/ValueListItem.types';
import ValueListItem from './ValueListItem/ValueListItem';

// Internal dependencies.
import { ValueListProps, ValueListVariant } from './ValueList.types';
import { DEFAULT_VALUELIST_VARIANT } from './ValueList.constants';

const ValueList: React.FC<ValueListProps> = ({
  variant = DEFAULT_VALUELIST_VARIANT,
  options = [],
  filterCallback,
  isSearchable,
  SkinComponent,
  ...props
}) => {
  const [selectedItem, setSelectedItem] = useState<ValueListItemProps | null>(
    null,
  );

  const renderValueListItem = (valueOptions: ValueListItemProps[]) => (
    <>
      {valueOptions.map((optionProps, index) => {
        const onPressHandler = (event: GestureResponderEvent) => {
          optionProps.onPress?.(event);
          if (variant === ValueListVariant.Select) {
            setSelectedItem(optionProps);
          }
        };
        const RenderingComponent = SkinComponent || ValueListItem;
        return (
          <RenderingComponent
            key={index}
            variant={variant}
            onPress={onPressHandler}
            isSelected={optionProps === selectedItem}
            {...optionProps}
          />
        );
      })}
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

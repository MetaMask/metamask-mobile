/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useState } from 'react';
import { GestureResponderEvent } from 'react-native';

// External dependencies.
import ListBase from '../../foundation/ListBase';
import TextFieldSearch from '../../../Form/TextFieldSearch';
import { ListItemMultiSelectProps } from '../../ListItemMultiSelect/ListItemMultiSelect.types';
import ListItemMultiSelect from '../../ListItemMultiSelect';

// Internal dependencies.
import { ListMultiSelectProps } from './ListMultiSelect.types';

const ListMultiSelect: React.FC<ListMultiSelectProps> = ({
  style,
  options,
  isSearchable,
  textFieldSearchProps,
  getFilteredListOptions,
  ...props
}) => {
  const [searchText, setSearchText] = useState('');

  const onChangeSearchText = (text: string) => {
    setSearchText(text);
    textFieldSearchProps?.onChangeText?.(text);
  };

  const renderListItem = (option: ListItemMultiSelectProps, index: number) => {
    let isSelected = option.isSelected;
    const onPressHandler = (event: GestureResponderEvent) => {
      option.onPress?.(event);
      isSelected = !isSelected;
    };
    return (
      <ListItemMultiSelect
        {...option}
        key={index}
        onPress={onPressHandler}
        isSelected={isSelected}
      />
    );
  };

  const renderList = () => {
    const filteredOptions: ListItemMultiSelectProps[] = isSearchable
      ? getFilteredListOptions(searchText)
      : options;
    return (
      <>
        {filteredOptions.map((option: ListItemMultiSelectProps, index) =>
          renderListItem(option, index),
        )}
      </>
    );
  };

  return (
    <ListBase
      topAccessory={
        isSearchable && (
          <TextFieldSearch
            value={searchText}
            {...textFieldSearchProps}
            onChangeText={onChangeSearchText}
          />
        )
      }
      {...props}
    >
      {renderList()}
    </ListBase>
  );
};

export default ListMultiSelect;

/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useState } from 'react';
import { GestureResponderEvent } from 'react-native';

// External dependencies.
import ListBase from '../../foundation/ListBase';
import { ListItemSelectProps } from '../../ListItemSelect/ListItemSelect.types';
import ListItemSelect from '../../ListItemSelect';
import TextFieldSearch from '../../../Form/TextFieldSearch';

// Internal dependencies.
import { ListSelectProps, ListSelectOption } from './ListSelect.types';

const ListSelect: React.FC<ListSelectProps> = ({
  style,
  options,
  selectedOption,
  isSearchable,
  textFieldSearchProps,
  getFilteredListOptions,
  ...props
}) => {
  const [selectedItem, setSelectedItem] = useState<
    ListItemSelectProps | undefined
  >(selectedOption);
  const [searchText, setSearchText] = useState('');

  const onChangeSearchText = (text: string) => {
    setSearchText(text);
    textFieldSearchProps?.onChangeText?.(text);
  };

  const renderListItem = (option: ListSelectOption, index: number) => {
    const onPressHandler = (event: GestureResponderEvent) => {
      option.onPress?.(event);
      setSelectedItem(option);
    };
    return (
      <ListItemSelect
        {...option}
        key={index}
        onPress={onPressHandler}
        isSelected={option === selectedItem}
      />
    );
  };

  const renderList = () => {
    const filteredOptions: ListSelectOption[] = isSearchable
      ? getFilteredListOptions(searchText)
      : options;
    return (
      <>
        {filteredOptions.map((option: ListItemSelectProps, index) =>
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

export default ListSelect;

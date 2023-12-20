/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useState } from 'react';

// External dependencies.
import TextFieldSearch from '../../Form/TextFieldSearch/TextFieldSearch';

// Internal dependencies.
import { ListSearchableProps } from './ListSearchable.types';
import ListSearchableBase from './foundation/ListSearchableBase';

const ListSearchable: React.FC<ListSearchableProps> = ({
  textFieldSearchProps,
  renderFilteredList,
  ...props
}) => {
  const [searchText, setSearchText] = useState('');

  const onChangeSearchText = (text: string) => {
    setSearchText(text);
    textFieldSearchProps?.onChangeText?.(text);
  };

  return (
    <ListSearchableBase
      searchInputEl={
        <TextFieldSearch
          value={searchText}
          {...textFieldSearchProps}
          onChangeText={onChangeSearchText}
        />
      }
      filteredListEl={renderFilteredList(searchText)}
      {...props}
    />
  );
};

export default ListSearchable;

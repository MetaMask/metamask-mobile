/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useState } from 'react';

// External dependencies.
import TextFieldSearch from '../../../Form/TextFieldSearch/TextFieldSearch';

// Internal dependencies.
import { ListSearchableProps } from './ListSearchable.types';
import ListBase from '../ListBase';

const ListSearchable: React.FC<ListSearchableProps> = ({
  textFieldSearchProps,
  renderFilteredListCallback,
  ...props
}) => {
  const [searchText, setSearchText] = useState('');

  const onChangeSearchText = (text: string) => {
    setSearchText(text);
    textFieldSearchProps?.onChangeText?.(text);
  };

  return (
    <ListBase
      topAccessory={
        <TextFieldSearch
          value={searchText}
          {...textFieldSearchProps}
          onChangeText={onChangeSearchText}
        />
      }
      {...props}
    >
      {renderFilteredListCallback(searchText)}
    </ListBase>
  );
};

export default ListSearchable;

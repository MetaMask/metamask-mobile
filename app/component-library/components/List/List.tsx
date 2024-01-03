/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// Internal dependencies.
import { ListProps } from './List.types';
import ListBase from './foundation/ListBase';
import ListSearchable from './variants/ListSearchable/ListSearchable';

const List: React.FC<ListProps> = ({
  isSearchable = false,
  renderFilteredListCallback,
  ...props
}) => {
  if (isSearchable) {
    if (!renderFilteredListCallback) {
      throw new Error(
        'renderFilteredListCallback is required when isSearchable is true',
      );
    }
    return (
      <ListSearchable
        renderFilteredListCallback={renderFilteredListCallback}
        {...props}
      />
    );
  }
  return <ListBase {...props} />;
};

export default List;

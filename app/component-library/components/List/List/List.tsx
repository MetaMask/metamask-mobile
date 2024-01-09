/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { ListItemProps } from '../../ListItem/ListItem/ListItem.types';
import ListItem from '../../ListItem/ListItem';
import BaseList from '../../../base-components/List/BaseList';

// Internal dependencies.
import { ListProps } from './List.types';

const List: React.FC<ListProps> = ({ options = [], ...props }) => {
  const renderListItem = (optionProps: ListItemProps) => (
    <ListItem {...optionProps} />
  );

  return (
    <BaseList {...props}>
      {options.map((optionProps) => renderListItem(optionProps))}
    </BaseList>
  );
};

export default List;

/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// External dependencies.
import { ListItemProps } from '../../ListItem/ListItem/ListItem.types';

// Internal dependencies.
import { default as ListMultiSelectComponent } from './ListMultiSelect';

const ListMultiSelectStoryMeta = {
  title: 'Component Library / List',
  component: ListMultiSelectComponent,
};

export default ListMultiSelectStoryMeta;

const sampleOptions: ListItemProps[] = [
  {
    label: 'Token',
    description: 'Token description',
  },
  {
    label: 'Network',
    description: 'Network description',
  },
  {
    label: 'Avatar',
    description: 'Avatar description',
  },
  {
    label: 'AvatarToken',
    description: 'AvatarToken description',
  },
];
export const ListMultiSelect = {
  render: (args: any) => (
    <ListMultiSelectComponent {...args} options={sampleOptions} />
  ),
};

/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// External dependencies.
import { ListItemProps } from '../../ListItem/ListItem/ListItem.types';

// Internal dependencies.
import { default as ListSelectComponent } from './ListSelect';

const ListSelectStoryMeta = {
  title: 'Component Library / List',
  component: ListSelectComponent,
};

export default ListSelectStoryMeta;

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
export const ListSelect = {
  render: (args: any) => (
    <ListSelectComponent {...args} options={sampleOptions} />
  ),
};

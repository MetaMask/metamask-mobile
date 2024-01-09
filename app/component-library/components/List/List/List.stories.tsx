/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// External dependencies.
import { ListItemProps } from '../../ListItem/ListItem/ListItem.types';

// Internal dependencies.
import { default as ListComponent } from './List';

const ListStoryMeta = {
  title: 'Component Library / List',
  component: ListComponent,
};

export default ListStoryMeta;

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
export const List = {
  render: (args: any) => <ListComponent {...args} options={sampleOptions} />,
};

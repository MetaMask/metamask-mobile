/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// External dependencies.
import { ListItemProps } from '../../../ListItem/ListItem/ListItem.types';

// Internal dependencies.
import { default as SelectMenuComponent } from './SelectMenu';

const SelectMenuStoryMeta = {
  title: 'Component Library / Select',
  component: SelectMenuComponent,
};

export default SelectMenuStoryMeta;

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
export const SelectMenu = {
  render: (args: any) => (
    <SelectMenuComponent {...args} options={sampleOptions} />
  ),
};

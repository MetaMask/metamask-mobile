/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// External dependencies.
import { ListItemProps } from '../../ListItem/ListItem/ListItem.types';
import { SAMPLE_LISTITEM_PROPS } from '../../ListItem/ListItem/ListItem.constants';

// Internal dependencies.
import { default as SelectComponent } from './Select';

const SelectStoryMeta = {
  title: 'Component Library / Select',
  component: SelectComponent,
};

export default SelectStoryMeta;

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
export const Select = {
  render: (args: any) => (
    <SelectComponent
      {...args}
      value={{ ...SAMPLE_LISTITEM_PROPS }}
      options={sampleOptions}
    />
  ),
};

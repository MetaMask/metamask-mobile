/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// External dependencies.
import { SelectOptionProps } from '../SelectOption/SelectOption.types';

// Internal dependencies.
import { default as SelectOptionsListComponent } from './SelectOptionsList';

const sampleOptions: SelectOptionProps[] = [
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

const SelectOptionsListMeta = {
  title: 'Component Library / Select',
  component: SelectOptionsListComponent,
};
export default SelectOptionsListMeta;

export const SelectOptionsList = {
  render: (args: any) => (
    <SelectOptionsListComponent {...args} options={sampleOptions} />
  ),
};

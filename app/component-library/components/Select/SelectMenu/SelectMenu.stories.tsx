/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// External dependencies.
import { SelectOptionProps } from '../SelectOption/SelectOption.types';

// Internal dependencies.
import { default as SelectMenuComponent } from './SelectMenu';

const SelectMenuStoryMeta = {
  title: 'Component Library / Select',
  component: SelectMenuComponent,
  argTypes: {
    title: {
      control: { type: 'text' },
    },
    description: {
      control: { type: 'text' },
    },
  },
};

export default SelectMenuStoryMeta;

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

export const SelectMenu = {
  args: {
    title: 'test Title',
    description: 'test Description',
  },
  render: (args: any) => (
    <SelectMenuComponent {...args} options={sampleOptions} />
  ),
};

/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// External dependencies.
import { SelectOptionProps } from './SelectOption/SelectOption.types';
import { SAMPLE_SELECTVALUE_PROPS } from './SelectValue/SelectValue.constants';

// Internal dependencies.
import { default as SelectComponent } from './Select';

const SelectStoryMeta = {
  title: 'Component Library / Select',
  component: SelectComponent,
  argTypes: {
    title: {
      control: { type: 'text' },
    },
    description: {
      control: { type: 'text' },
    },
  },
};

export default SelectStoryMeta;

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

export const Select = {
  args: {
    title: 'test Title',
    description: 'test Description',
    placeholder: 'test',
  },
  render: (args: any) => (
    <SelectComponent
      {...args}
      options={sampleOptions}
      value={SAMPLE_SELECTVALUE_PROPS}
    />
  ),
};

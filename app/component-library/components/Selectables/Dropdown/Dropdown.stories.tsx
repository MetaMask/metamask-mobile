/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// External dependencies.
import { ValueListItemProps } from '../../ValueList/ValueListItem/ValueListItem.types';
import { SAMPLE_VALUELISTITEM_PROPS } from '../../ValueList/ValueListItem/ValueListItem.constants';

// Internal dependencies.
import { default as DropdownComponent } from './Dropdown';

const DropdownStoryMeta = {
  title: 'Component Library / Dropdown',
  component: DropdownComponent,
  argTypes: {
    title: {
      control: { type: 'text' },
    },
    description: {
      control: { type: 'text' },
    },
    isSearchable: {
      control: { type: 'boolean' },
    },
  },
};

export default DropdownStoryMeta;

const sampleOptions: ValueListItemProps[] = [
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

export const Dropdown = {
  args: {
    title: 'test Title',
    description: 'test Description',
    placeholder: 'test',
    isSearchable: false,
  },
  render: (args: any) => (
    <DropdownComponent
      {...args}
      options={sampleOptions}
      value={SAMPLE_VALUELISTITEM_PROPS}
    />
  ),
};

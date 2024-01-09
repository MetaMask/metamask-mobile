/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// External dependencies.
import { ValueListItemProps } from './ValueListItem/ValueListItem.types';

// Internal dependencies.
import { default as ValueListComponent } from './ValueList';
import { ValueListVariant } from './ValueList.types';

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

const ValueListMeta = {
  title: 'Component Library / ValueList',
  component: ValueListComponent,
  argTypes: {
    variant: {
      options: ValueListVariant,
      control: {
        type: 'select',
      },
    },
    isSearchable: {
      control: { type: 'boolean' },
    },
  },
};
export default ValueListMeta;

export const ValueList = {
  args: {
    variant: ValueListVariant.Display,
    isSearchable: false,
  },
  render: (args: any) => (
    <ValueListComponent {...args} options={sampleOptions} />
  ),
};

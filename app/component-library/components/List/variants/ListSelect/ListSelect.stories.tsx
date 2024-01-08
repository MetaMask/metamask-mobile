/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// External dependencies.
import Text from '../../../Texts/Text';

// Internal dependencies.
import { default as ListSelectComponent } from './ListSelect';
import { ListSelectOption } from './ListSelect.types';

const ListSelectStoryMeta = {
  title: 'Component Library / ListSelect',
  component: ListSelectComponent,
};

export default ListSelectStoryMeta;

const options: ListSelectOption[] = [
  {
    isDisabled: false,
    children: <Text> Option 1</Text>,
  },
  {
    isDisabled: true,
    children: <Text> Option 2</Text>,
  },
  {
    isDisabled: false,
    children: <Text> Option 3</Text>,
  },
];
export const ListSelect = {
  render: (args: any) => <ListSelectComponent {...args} options={options} />,
};

/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// External dependencies.
import Text from '../../../Texts/Text';
import { ListItemMultiSelectProps } from '../../ListItemMultiSelect/ListItemMultiSelect.types';

// Internal dependencies.
import { default as ListMultiSelectComponent } from './ListMultiSelect';

const ListMultiSelectStoryMeta = {
  title: 'Component Library / ListMultiSelect',
  component: ListMultiSelectComponent,
};

export default ListMultiSelectStoryMeta;

const options: ListItemMultiSelectProps[] = [
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
export const ListMultiSelect = {
  render: (args: any) => (
    <ListMultiSelectComponent {...args} options={options} />
  ),
};

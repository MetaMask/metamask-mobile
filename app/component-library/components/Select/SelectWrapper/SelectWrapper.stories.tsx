/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// Internal dependencies.
import { default as SelectWrapperComponent } from './SelectWrapper';

const SelectWrapperStoryMeta = {
  title: 'Component Library / SelectWrapper',
  component: SelectWrapperComponent,
};

export default SelectWrapperStoryMeta;

export const SelectWrapper = {
  render: (args: any) => (
    <SelectWrapperComponent {...args} placeholder="Test" />
  ),
};

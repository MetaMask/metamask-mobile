/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// External dependencies.
import SelectOption from '../SelectOption/SelectOption';

// Internal dependencies.
import { default as SelectWrapperComponent } from './SelectWrapper';

const SelectWrapperStoryMeta = {
  title: 'Component Library / Select',
  component: SelectWrapperComponent,
};

export default SelectWrapperStoryMeta;

export const SelectWrapper = {
  render: (args: any) => (
    <SelectWrapperComponent placeholder="Test">
      <SelectOption label="label1" />
    </SelectWrapperComponent>
  ),
};

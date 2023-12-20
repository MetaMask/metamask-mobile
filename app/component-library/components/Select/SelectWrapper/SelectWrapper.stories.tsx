/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// External dependencies.
import SelectOption from '../SelectOption/SelectOption';
import { SAMPLE_SELECTVALUE_PROPS } from '../SelectValue/SelectValue.constants';

// Internal dependencies.
import { default as SelectWrapperComponent } from './SelectWrapper';

const SelectWrapperStoryMeta = {
  title: 'Component Library / Select',
  component: SelectWrapperComponent,
  argTypes: {
    placeholder: {
      control: { type: 'text' },
    },
  },
};

export default SelectWrapperStoryMeta;

export const SelectWrapper = {
  render: () => (
    <SelectWrapperComponent value={SAMPLE_SELECTVALUE_PROPS}>
      <SelectOption {...SAMPLE_SELECTVALUE_PROPS} />
      <SelectOption {...SAMPLE_SELECTVALUE_PROPS} />
      <SelectOption {...SAMPLE_SELECTVALUE_PROPS} />
    </SelectWrapperComponent>
  ),
};

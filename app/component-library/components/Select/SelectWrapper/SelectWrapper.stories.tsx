/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// External dependencies.
import SelectOption from '../SelectOption/SelectOption';
import { SAMPLE_SELECTVALUE_PROPS } from '../SelectValue/SelectValue.constants';

// Internal dependencies.
import { default as Select } from './SelectWrapper';

const SelectWrapperStoryMeta = {
  title: 'Component Library / Select / SelectWrapper',
  component: Select,
};

export default SelectWrapperStoryMeta;

export const SelectWrapperCustom1 = {
  render: (args: any) => (
    <Select value={SAMPLE_SELECTVALUE_PROPS}>
      <SelectOption {...SAMPLE_SELECTVALUE_PROPS} />
      <SelectOption {...SAMPLE_SELECTVALUE_PROPS} />
      <SelectOption {...SAMPLE_SELECTVALUE_PROPS} />
    </Select>
  ),
};

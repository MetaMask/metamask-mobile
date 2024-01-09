/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// External dependencies.
import ValueListItem from '../../../../ValueList/ValueListItem/ValueListItem';
import { SAMPLE_VALUELISTITEM_PROPS } from '../../../../ValueList/ValueListItem/ValueListItem.constants';

// Internal dependencies.
import { default as SelectWrapperComponent } from './SelectWrapper';

const SelectWrapperStoryMeta = {
  title: 'Component Library / Selectables / Select',
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
    <SelectWrapperComponent value={SAMPLE_VALUELISTITEM_PROPS}>
      <ValueListItem {...SAMPLE_VALUELISTITEM_PROPS} />
      <ValueListItem {...SAMPLE_VALUELISTITEM_PROPS} />
      <ValueListItem {...SAMPLE_VALUELISTITEM_PROPS} />
    </SelectWrapperComponent>
  ),
};

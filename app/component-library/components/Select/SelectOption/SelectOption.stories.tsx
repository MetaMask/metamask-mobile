/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// Internal dependencies.
import { default as SelectOptionComponent } from './SelectOption';
import { SAMPLE_SELECTOPTION_PROPS } from './SelectOption.constants';

const SelectOptionStoryMeta = {
  title: 'Component Library / Select',
  component: SelectOptionComponent,
  argTypes: {
    label: {
      control: { type: 'text' },
      defaultValue: SAMPLE_SELECTOPTION_PROPS.label,
    },
    description: {
      control: { type: 'text' },
      defaultValue: SAMPLE_SELECTOPTION_PROPS.description,
    },
    isSelected: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_SELECTOPTION_PROPS.isSelected,
    },
    isDisabled: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_SELECTOPTION_PROPS.isDisabled,
    },
  },
};

export default SelectOptionStoryMeta;

export const SelectOption = {
  render: (args: any) => (
    <SelectOptionComponent
      {...args}
      iconProps={SAMPLE_SELECTOPTION_PROPS.iconProps}
    />
  ),
};

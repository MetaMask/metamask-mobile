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
    },
    description: {
      control: { type: 'text' },
    },
    isSelected: {
      control: { type: 'boolean' },
    },
    isDisabled: {
      control: { type: 'boolean' },
    },
  },
};

export default SelectOptionStoryMeta;

export const SelectOption = {
  args: {
    label: SAMPLE_SELECTOPTION_PROPS.label,
    description: SAMPLE_SELECTOPTION_PROPS.description,
    isSelected: SAMPLE_SELECTOPTION_PROPS.isSelected,
    isDisabled: SAMPLE_SELECTOPTION_PROPS.isDisabled,
  },
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: (args: any) => (
    <SelectOptionComponent
      {...args}
      iconProps={SAMPLE_SELECTOPTION_PROPS.iconProps}
    />
  ),
};

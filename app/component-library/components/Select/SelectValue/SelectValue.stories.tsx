/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// Internal dependencies.
import { default as SelectValueComponent } from './SelectValue';
import { SAMPLE_SELECTVALUE_PROPS } from './SelectValue.constants';

const SelectValueStoryMeta = {
  title: 'Component Library / Select',
  component: SelectValueComponent,
  argTypes: {
    label: {
      control: { type: 'text' },
      defaultValue: SAMPLE_SELECTVALUE_PROPS.label,
    },
    description: {
      control: { type: 'text' },
      defaultValue: SAMPLE_SELECTVALUE_PROPS.description,
    },
  },
};

export default SelectValueStoryMeta;

export const SelectValue = {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: (args: any) => (
    <SelectValueComponent
      {...args}
      iconProps={SAMPLE_SELECTVALUE_PROPS.iconProps}
    />
  ),
};

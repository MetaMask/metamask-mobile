/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// Internal dependencies.
import { default as SelectButtonComponent } from './SelectButton';
import { SelectButtonSize } from './SelectButton.types';
import { SAMPLE_SELECTBUTTON_PROPS } from './SelectButton.constants';

const SelectButtonStoryMeta = {
  title: 'Component Library / Select',
  component: SelectButtonComponent,
  argTypes: {
    size: {
      options: SelectButtonSize,
      control: {
        type: 'select',
      },
    },
    label: {
      control: { type: 'text' },
    },
    description: {
      control: { type: 'text' },
    },
    isDisabled: {
      control: { type: 'boolean' },
    },
    isDanger: {
      control: { type: 'boolean' },
    },
  },
};

export default SelectButtonStoryMeta;

export const SelectButton = {
  args: {
    size: SAMPLE_SELECTBUTTON_PROPS.size,
    label: SAMPLE_SELECTBUTTON_PROPS.label,
    description: SAMPLE_SELECTBUTTON_PROPS.description,
    isDisabled: SAMPLE_SELECTBUTTON_PROPS.isDisabled,
    isDanger: SAMPLE_SELECTBUTTON_PROPS.isDanger,
  },
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: (args: any) => (
    <SelectButtonComponent
      {...args}
      iconProps={SAMPLE_SELECTBUTTON_PROPS.iconProps}
    />
  ),
};

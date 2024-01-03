/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// Internal dependencies.
import { default as DropdownButtonComponent } from './DropdownButton';
import { DropdownButtonSize } from './DropdownButton.types';
import { SAMPLE_DROPDOWNBUTTON_PROPS } from './DropdownButton.constants';

const DropdownButtonStoryMeta = {
  title: 'Component Library / Selectables / Dropdown',
  component: DropdownButtonComponent,
  argTypes: {
    size: {
      options: DropdownButtonSize,
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

export default DropdownButtonStoryMeta;

export const DropdownButton = {
  args: {
    size: SAMPLE_DROPDOWNBUTTON_PROPS.size,
    label: SAMPLE_DROPDOWNBUTTON_PROPS.label,
    isDisabled: SAMPLE_DROPDOWNBUTTON_PROPS.isDisabled,
    isDanger: SAMPLE_DROPDOWNBUTTON_PROPS.isDanger,
  },
  render: (args: any) => (
    <DropdownButtonComponent
      {...args}
      iconProps={SAMPLE_DROPDOWNBUTTON_PROPS.iconProps}
    />
  ),
};

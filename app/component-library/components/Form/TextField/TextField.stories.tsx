/* eslint-disable react/display-name */
import React from 'react';

// Internal dependencies.
import { default as TextFieldComponent } from './TextField';
import { SAMPLE_TEXTFIELD_PROPS } from './TextField.constants';
import { TextFieldProps, TextFieldSize } from './TextField.types';

const TextFieldMeta = {
  title: 'Component Library / Form',
  component: TextFieldComponent,
  argTypes: {
    size: {
      options: Object.values(TextFieldSize),
      mapping: Object.values(TextFieldSize),
      control: {
        type: 'select',
        labels: Object.keys(TextFieldSize),
      },
    },
    isError: {
      control: { type: 'boolean' },
    },
    isDisabled: {
      control: { type: 'boolean' },
    },
  },
};
export default TextFieldMeta;

export const TextField = {
  args: SAMPLE_TEXTFIELD_PROPS,
  render: (
    args: JSX.IntrinsicAttributes &
      TextFieldProps & { children?: React.ReactNode },
  ) => (
    <TextFieldComponent
      {...args}
      startAccessory={args.startAccessory}
      endAccessory={args.endAccessory}
    />
  ),
};

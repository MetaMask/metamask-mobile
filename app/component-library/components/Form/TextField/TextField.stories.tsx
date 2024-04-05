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
      options: TextFieldSize,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_TEXTFIELD_PROPS.size,
    },
    isError: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_TEXTFIELD_PROPS.isError,
    },
    isDisabled: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_TEXTFIELD_PROPS.isDisabled,
    },
    isReadonly: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_TEXTFIELD_PROPS.isReadonly,
    },
    placeholder: {
      control: { type: 'text' },
      defaultValue: SAMPLE_TEXTFIELD_PROPS.placeholder,
    },
  },
};
export default TextFieldMeta;

export const TextField = {
  render: (
    args: JSX.IntrinsicAttributes &
      TextFieldProps & { children?: React.ReactNode },
  ) => (
    <TextFieldComponent
      {...args}
      startAccessory={SAMPLE_TEXTFIELD_PROPS.startAccessory}
      endAccessory={SAMPLE_TEXTFIELD_PROPS.endAccessory}
    />
  ),
};

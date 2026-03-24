import React from 'react';
import { View } from 'react-native';

import Icon, { IconName, IconSize } from '../../Icons/Icon';

import TextField from './TextField';

const TextFieldMeta = {
  title: 'Component Library / Form / TextField',
  component: TextField,
  argTypes: {
    isError: {
      control: 'boolean',
    },
    isDisabled: {
      control: 'boolean',
    },
    isReadonly: {
      control: 'boolean',
    },
    placeholder: {
      control: 'text',
    },
  },
};

export default TextFieldMeta;

export const Default = {
  args: {
    placeholder: 'Enter text...',
  },
};

export const WithPlaceholder = {
  args: {
    placeholder: 'Enter your name',
  },
};

export const ErrorState = {
  args: {
    placeholder: 'Enter text...',
    isError: true,
  },
};

export const Disabled = {
  args: {
    placeholder: 'Disabled field',
    isDisabled: true,
  },
};

export const ReadonlyState = {
  args: {
    placeholder: 'Readonly field',
    value: 'This is readonly',
    isReadonly: true,
  },
};

export const WithStartAccessory = {
  render: () => (
    <TextField
      placeholder="Search..."
      startAccessory={<Icon name={IconName.Search} size={IconSize.Md} />}
    />
  ),
};

export const WithEndAccessory = {
  render: () => (
    <TextField
      placeholder="Enter amount"
      endAccessory={
        <View>
          <Icon name={IconName.Check} size={IconSize.Md} />
        </View>
      }
    />
  ),
};

export const WithBothAccessories = {
  render: () => (
    <TextField
      placeholder="Search..."
      startAccessory={<Icon name={IconName.Search} size={IconSize.Md} />}
      endAccessory={<Icon name={IconName.Close} size={IconSize.Md} />}
    />
  ),
};

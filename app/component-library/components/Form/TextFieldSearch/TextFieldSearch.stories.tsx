/* eslint-disable no-console */
import React from 'react';

import TextFieldSearch from './TextFieldSearch';

const TextFieldSearchMeta = {
  title: 'Component Library / Form / TextFieldSearch',
  component: TextFieldSearch,
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
    showClearButton: {
      control: 'boolean',
    },
  },
};

export default TextFieldSearchMeta;

export const Default = {
  args: {
    placeholder: 'Search',
  },
};

export const WithClearButton = {
  render: () => (
    <TextFieldSearch
      placeholder="Search..."
      showClearButton
      onPressClearButton={() => console.log('Clear pressed')}
    />
  ),
};

export const ErrorState = {
  args: {
    placeholder: 'Search',
    isError: true,
  },
};

export const Disabled = {
  args: {
    placeholder: 'Search disabled',
    isDisabled: true,
  },
};

export const ReadonlyState = {
  args: {
    placeholder: 'Search readonly',
    value: 'Search query',
    isReadonly: true,
  },
};

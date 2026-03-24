import React, { useState } from 'react';

import TextFieldSearch from './TextFieldSearch';
import { TextFieldSearchProps } from './TextFieldSearch.types';

const noop = () => undefined;

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
  },
};

export default TextFieldSearchMeta;

export const Default = {
  args: {
    placeholder: 'Search',
    onPressClearButton: noop,
  },
};

const InteractiveTextFieldSearch = (args: TextFieldSearchProps) => {
  const [value, setValue] = useState('');
  return (
    <TextFieldSearch
      {...args}
      value={value}
      onChangeText={setValue}
      onPressClearButton={() => setValue('')}
    />
  );
};

export const Interactive = {
  render: (args: TextFieldSearchProps) => (
    <InteractiveTextFieldSearch {...args} />
  ),
  args: {
    placeholder: 'Type to see clear button...',
    onPressClearButton: noop,
  },
};

export const WithValue = {
  args: {
    placeholder: 'Search...',
    value: 'Search text',
    onPressClearButton: noop,
  },
};

export const ErrorState = {
  args: {
    placeholder: 'Search',
    isError: true,
    onPressClearButton: noop,
  },
};

export const Disabled = {
  args: {
    placeholder: 'Search disabled',
    isDisabled: true,
    onPressClearButton: noop,
  },
};

export const ReadonlyState = {
  args: {
    placeholder: 'Search readonly',
    value: 'Search query',
    isReadonly: true,
    onPressClearButton: noop,
  },
};

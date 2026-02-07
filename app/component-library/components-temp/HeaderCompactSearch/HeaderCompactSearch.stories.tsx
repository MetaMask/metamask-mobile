/* eslint-disable no-console */
import React, { useState } from 'react';

import HeaderCompactSearch from './HeaderCompactSearch';
import { HeaderCompactSearchVariant } from './HeaderCompactSearch.types';

const HeaderCompactSearchMeta = {
  title: 'Components Temp / HeaderCompactSearch',
  component: HeaderCompactSearch,
  argTypes: {
    variant: {
      control: 'select',
      options: [
        HeaderCompactSearchVariant.Screen,
        HeaderCompactSearchVariant.Inline,
      ],
    },
    twClassName: {
      control: 'text',
    },
  },
};

export default HeaderCompactSearchMeta;

export const Screen = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <HeaderCompactSearch
        variant={HeaderCompactSearchVariant.Screen}
        onPressBackButton={() => console.log('Back pressed')}
        textFieldSearchProps={{
          value,
          onChangeText: setValue,
          onPressClearButton: () => setValue(''),
          placeholder: 'Search tokens, sites, URLs',
        }}
      />
    );
  },
};

export const Inline = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <HeaderCompactSearch
        variant={HeaderCompactSearchVariant.Inline}
        onPressCancelButton={() => console.log('Cancel pressed')}
        textFieldSearchProps={{
          value,
          onChangeText: setValue,
          onPressClearButton: () => setValue(''),
          placeholder: 'Search tokens, sites, URLs',
        }}
      />
    );
  },
};

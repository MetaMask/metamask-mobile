/* eslint-disable no-console */
import React, { useState } from 'react';

import HeaderSearch from './HeaderSearch';
import { HeaderSearchVariant } from './HeaderSearch.types';

const HeaderSearchMeta = {
  title: 'Components Temp / HeaderSearch',
  component: HeaderSearch,
  argTypes: {
    variant: {
      control: 'select',
      options: [HeaderSearchVariant.Screen, HeaderSearchVariant.Inline],
    },
    twClassName: {
      control: 'text',
    },
  },
};

export default HeaderSearchMeta;

const ScreenStory = () => {
  const [value, setValue] = useState('');
  return (
    <HeaderSearch
      variant={HeaderSearchVariant.Screen}
      onPressBackButton={() => console.log('Back pressed')}
      textFieldSearchProps={{
        value,
        onChangeText: setValue,
        onPressClearButton: () => setValue(''),
        placeholder: 'Search tokens, sites, URLs',
      }}
    />
  );
};

export const Screen = {
  render: () => <ScreenStory />,
};

const InlineStory = () => {
  const [value, setValue] = useState('');
  return (
    <HeaderSearch
      variant={HeaderSearchVariant.Inline}
      onPressCancelButton={() => console.log('Cancel pressed')}
      textFieldSearchProps={{
        value,
        onChangeText: setValue,
        onPressClearButton: () => setValue(''),
        placeholder: 'Search tokens, sites, URLs',
      }}
    />
  );
};

export const Inline = {
  render: () => <InlineStory />,
};

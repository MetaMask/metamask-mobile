// Third party dependencies
import React from 'react';

// External dependencies
import Text from '../components/Texts/Text';
import { TextProps } from '../components/Texts/Text/Text.types';

const renderStringOrNode = (
  stringOrNode: React.ReactNode | string,
  textProps?: Partial<TextProps>,
) => {
  if (typeof stringOrNode === 'string') {
    return <Text {...textProps}>{stringOrNode}</Text>;
  }
  return stringOrNode;
};

export default renderStringOrNode;

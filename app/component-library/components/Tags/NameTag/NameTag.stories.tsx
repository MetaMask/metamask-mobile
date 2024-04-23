/* eslint-disable react/display-name */
/* eslint-disable react-native/no-inline-styles */
// External dependencies.
import React from 'react';
import { View } from 'react-native';

// Internal dependencies.
import { default as NameTag } from './NameTag';

const NameTagMeta = {
  title: 'Component Library / Tags',
  component: NameTag,
  argTypes: {
    label: {
      control: { type: 'text' },
      defaultValue: 'Imported',
    },
  },
};
export default NameTagMeta;

export const Tag = {
  render: () => (
    <View style={{ alignItems: 'flex-start' }}>
      <NameTag />
    </View>
  ),
};

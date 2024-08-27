/* eslint-disable react/display-name */
/* eslint-disable react-native/no-inline-styles */
// External dependencies.
import React from 'react';
import { View } from 'react-native';

// Internal dependencies.
import { default as TagComponent } from './Tag';

const TagMeta = {
  title: 'Component Library / Tags',
  component: TagComponent,
  argTypes: {
    label: {
      control: { type: 'text' },
      defaultValue: 'Imported',
    },
  },
};
export default TagMeta;

export const Tag = {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: ({ label }: any) => (
    <View style={{ alignItems: 'flex-start' }}>
      <TagComponent label={label} />
    </View>
  ),
};

/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react/display-name */
/* eslint-disable no-console */
// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// Internal dependencies.
import { default as SkeletonComponent } from './Skeleton';
import { SkeletonShape } from './Skeleton.types';

const SkeletonMeta = {
  title: 'Component Library / Skeleton',
  component: SkeletonComponent,
  argTypes: {
    width: {
      control: {
        type: 'number',
        min: 10,
        defaultValue: 10,
      },
    },
    height: {
      control: {
        type: 'number',
        min: 10,
        defaultValue: 10,
      },
    },
    shape: {
      options: SkeletonShape,
      control: {
        type: 'select',
      },
      defaultValue: SkeletonShape.Rectangle,
    },
  },
};
export default SkeletonMeta;

export const Skeleton = {
  args: {
    width: 400,
    height: 200,
  },
  render: (args: any) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      <SkeletonComponent {...args} />
    </View>
  ),
};

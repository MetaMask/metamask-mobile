/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';
import { View, StyleSheet } from 'react-native';

import Device from '../../../../../../util/device';

// Internal dependencies.
import { default as ShapesBackgroundAnimationComponent } from '.';
import { mockTheme } from '../../../../../../util/theme';

const IS_NARROW = Device.getDeviceWidth() <= 320;
const STAGE_SIZE = IS_NARROW ? 240 : 260;

const styles = StyleSheet.create({
  storyContainer: {
    flex: 1,
    backgroundColor: mockTheme.colors.background.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  animationContainer: {
    width: STAGE_SIZE,
    height: STAGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const ShapesBackgroundAnimationMeta = {
  title: 'Components Animations / Loading Animation',
  component: ShapesBackgroundAnimationComponent,
  argTypes: {
    width: {
      control: { type: 'number' },
      defaultValue: STAGE_SIZE,
    },
    height: {
      control: { type: 'number' },
      defaultValue: STAGE_SIZE,
    },
  },
};

export default ShapesBackgroundAnimationMeta;

export const ShapesBackgroundAnimation = {
  render: ({ width, height }: { width: number; height: number }) => (
    <View style={styles.storyContainer}>
      <View style={styles.animationContainer}>
        <ShapesBackgroundAnimationComponent width={width} height={height} />
      </View>
    </View>
  ),
};

/* eslint-disable no-console, react-native/no-inline-styles */

// Third party dependencies.
import React from 'react';
import { color } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { mockTheme } from '../../../util/theme';
import { storybookPropsGroupID } from '../../constants/storybook.constants';

// Internal dependencies.
import Overlay from './Overlay';
import { OverlayProps } from './Overlay.types';

export const getOverlayStoryProps = (): OverlayProps => {
  const colorSelector = color(
    'color',
    mockTheme.colors.overlay.default,
    storybookPropsGroupID,
  );

  return {
    color: colorSelector,
    onPress: () => console.log("I'm clicked!"),
  };
};

const OverlayStory = () => <Overlay {...getOverlayStoryProps()} />;

storiesOf('Component Library / Overlay', module).add('Overlay', OverlayStory);

export default OverlayStory;

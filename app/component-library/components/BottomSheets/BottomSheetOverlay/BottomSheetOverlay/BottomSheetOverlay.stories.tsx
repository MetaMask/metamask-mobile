/* eslint-disable no-console, react-native/no-inline-styles */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { getOverlayStoryProps } from '../../../Overlay/Overlay.stories';

// Internal dependencies.
import BottomSheetOverlay from './BottomSheetOverlay';
import { BottomSheetOverlayProps } from './BottomSheetOverlay.types';

export const getBottomSheetOverlayStoryProps = (): BottomSheetOverlayProps =>
  getOverlayStoryProps();

const BottomSheetOverlayStory = () => (
  <BottomSheetOverlay {...getBottomSheetOverlayStoryProps()} />
);

storiesOf('Component Library / BottomSheets', module).add(
  'BottomSheetOverlay',
  BottomSheetOverlayStory,
);

export default BottomSheetOverlayStory;

/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';

// Internal dependencies.
import BottomSheetHeader from './BottomSheetHeader';
import { BottomSheetHeaderProps } from './BottomSheetHeader.types';

export const getBottomSheetHeaderStoryProps = (): BottomSheetHeaderProps => ({
  onBack: () => {
    console.log('Back button clicked');
  },
  onClose: () => {
    console.log('Close button clicked');
  },
  children: 'Super Long BottomSheetHeader Title that may span 3 lines',
});

const BottomSheetHeaderStory = () => (
  <BottomSheetHeader {...getBottomSheetHeaderStoryProps()} />
);

storiesOf('Component Library / BottomSheets', module).add(
  'BottomSheetHeader',
  BottomSheetHeaderStory,
);

export default BottomSheetHeaderStory;

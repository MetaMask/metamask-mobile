/* eslint-disable no-console, react-native/no-inline-styles */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { storiesOf } from '@storybook/react-native';
import { boolean } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../constants/storybook.constants';
import Text, { TextVariant } from '../../Texts/Text';

// Internal dependencies.
import BottomSheetContent from './BottomSheetContent';
import { BottomSheetContentProps } from './BottomSheetContent.types';

export const getBottomSheetContentStoryProps = (): BottomSheetContentProps => ({
  isFullscreen: boolean('isFullscreen', false, storybookPropsGroupID),
  isInteractable: boolean('isInteractable', true, storybookPropsGroupID),
  onDismissed: () => {
    console.log('BottomSheetContent dismissed');
  },
});

const BottomSheetContentStory = () => (
  <BottomSheetContent {...getBottomSheetContentStoryProps()}>
    <View
      style={{
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text variant={TextVariant.BodySM}>{'Wrapped Content'}</Text>
    </View>
  </BottomSheetContent>
);

storiesOf('Component Library / BottomSheets', module).add(
  'BottomSheetContent',
  BottomSheetContentStory,
);

export default BottomSheetContentStory;

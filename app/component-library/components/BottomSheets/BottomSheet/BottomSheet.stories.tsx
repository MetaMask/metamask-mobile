/* react-native/no-inline-styles */

// Third party dependencies.
import React, { useRef } from 'react';
import { Alert, View } from 'react-native';
import { storiesOf } from '@storybook/react-native';
import { boolean } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../constants/storybook.constants';
import Text, { TextVariant } from '../../Texts/Text';

// Internal dependencies.
import BottomSheet from './BottomSheet';
import { BottomSheetRef } from './BottomSheet.types';

const BottomSheetFooterStory = () => {
  const bottomSheetRef = useRef<BottomSheetRef | null>(null);
  const isInteractable = boolean('isInteractable', true, storybookPropsGroupID);

  return (
    <BottomSheet
      onClose={() => Alert.alert('Dismissed sheet!')}
      ref={bottomSheetRef}
      isInteractable={isInteractable}
    >
      <View
        style={{
          height: 300,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant={TextVariant.BodySM}>{'Wrapped Content'}</Text>
      </View>
    </BottomSheet>
  );
};

storiesOf('Component Library / BottomSheets', module).add('BottomSheet', () => (
  <BottomSheetFooterStory />
));

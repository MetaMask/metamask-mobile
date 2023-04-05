// Third party dependencies.
import React, { useRef } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { storiesOf } from '@storybook/react-native';
import { boolean } from '@storybook/addon-knobs';

// External dependencies.
import Text, { TextVariant } from '../../Texts/Text';

// Internal dependencies.
import BottomSheet from './BottomSheet';
import { BottomSheetRef } from './BottomSheet.types';

const styles = StyleSheet.create({
  wrappedContent: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const BottomSheetExample = () => {
  const groupId = 'Props';
  const bottomSheetRef = useRef<BottomSheetRef | null>(null);
  const isInteractable = boolean('isInteractable', true, groupId);

  return (
    <BottomSheet
      onDismissed={() => Alert.alert('Dismissed sheet!')}
      ref={bottomSheetRef}
      isInteractable={isInteractable}
    >
      <View style={styles.wrappedContent}>
        <Text variant={TextVariant.BodySM}>{'Wrapped Content'}</Text>
      </View>
    </BottomSheet>
  );
};

storiesOf('Component Library / BottomSheet', module).add('Default', () => (
  <BottomSheetExample />
));

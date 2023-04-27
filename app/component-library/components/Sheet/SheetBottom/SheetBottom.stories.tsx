// Third party dependencies.
import React, { useRef } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { storiesOf } from '@storybook/react-native';
import { boolean } from '@storybook/addon-knobs';

// External dependencies.
import Text, { TextVariant } from '../../Texts/Text';

// Internal dependencies.
import SheetBottom from './SheetBottom';
import { SheetBottomRef } from './SheetBottom.types';

const styles = StyleSheet.create({
  wrappedContent: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const SheetBottomExample = () => {
  const groupId = 'Props';
  const bottomSheetRef = useRef<SheetBottomRef | null>(null);
  const isInteractable = boolean('isInteractable', true, groupId);

  return (
    <SheetBottom
      onDismissed={() => Alert.alert('Dismissed sheet!')}
      ref={bottomSheetRef}
      isInteractable={isInteractable}
    >
      <View style={styles.wrappedContent}>
        <Text variant={TextVariant.BodySM}>{'Wrapped Content'}</Text>
      </View>
    </SheetBottom>
  );
};

storiesOf('Component Library / SheetBottom', module).add('Default', () => (
  <SheetBottomExample />
));

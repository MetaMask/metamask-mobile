import React, { useRef } from 'react';
import { storiesOf } from '@storybook/react-native';
import { Alert, StyleSheet, View } from 'react-native';
import BaseText, { BaseTextVariant } from '../BaseText';
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
  const bottomSheetRef = useRef<BottomSheetRef | null>(null);

  return (
    <BottomSheet
      onDismiss={() => Alert.alert('Dismissed sheet!')}
      ref={bottomSheetRef}
    >
      <View style={styles.wrappedContent}>
        <BaseText variant={BaseTextVariant.sBodySM}>
          {'Wrapped Content'}
        </BaseText>
      </View>
    </BottomSheet>
  );
};

storiesOf('Component Library / BottomSheet', module).add('Default', () => (
  <BottomSheetExample />
));

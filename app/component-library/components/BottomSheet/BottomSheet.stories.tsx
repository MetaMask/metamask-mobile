/* eslint-disable no-console, react-native/no-inline-styles */
import React, { useRef } from 'react';
import { storiesOf } from '@storybook/react-native';
import BottomSheet from './BottomSheet';
import { View } from 'react-native';
import BaseText, { BaseTextVariant } from '../BaseText';
import { BottomSheetRef } from './BottomSheet.types';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const BottomSheetExample = () => {
  const bottomSheetRef = useRef<BottomSheetRef | null>(null);

  return (
    <BottomSheet ref={bottomSheetRef}>
      <View
        style={{
          height: 300,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <BaseText variant={BaseTextVariant.sBodySM}>
          {'Wrapped Content'}
        </BaseText>
      </View>
    </BottomSheet>
  );
};

storiesOf('Component Library / BottomSheet', module)
  .addDecorator((storyFn) => <SafeAreaProvider>{storyFn()}</SafeAreaProvider>)
  .add('Default', () => <BottomSheetExample />);

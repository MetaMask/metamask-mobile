/* eslint-disable no-console, react-native/no-inline-styles */
import React, { useRef } from 'react';
import { storiesOf } from '@storybook/react-native';
import BottomSheet from './BottomSheet';
import { boolean } from '@storybook/addon-knobs';
import { View } from 'react-native';
import { mockTheme } from '../../../util/theme';
import BaseText, { BaseTextVariant } from '../BaseText';
import { BottomSheetRef } from './BottomSheet.types';

const BottomSheetExample = () => {
  const bottomSheetRef = useRef<BottomSheetRef | null>(null);

  return (
    <BottomSheet ref={bottomSheetRef}>
      <View
        style={{
          height: 200,
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

storiesOf('Component Library / BottomSheet', module).add('Default', () => (
  <BottomSheetExample />
));

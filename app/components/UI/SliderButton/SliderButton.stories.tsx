/* eslint-disable no-console, react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import SliderButton from './index';

const SliderButtonMeta = {
  title: 'Components / UI / Sliders / SliderButton',
  component: SliderButton,
};

export default SliderButtonMeta;

export const Default = {
  render: () => (
    <Box twClassName="gap-2 p-4">
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        Swipe-to-confirm control (not a value slider). Legacy — confirmed unused
        in production.
      </Text>
      <View style={{ width: '100%' }}>
        <SliderButton
          incompleteText="Slide to swap"
          completeText="Swapping..."
          onComplete={() => {
            console.log('Swap confirmed');
          }}
        />
      </View>
    </Box>
  ),
};

export const Disabled = {
  render: () => (
    <Box twClassName="p-4">
      <SliderButton
        incompleteText="Slide to swap"
        completeText="Swapping..."
        disabled
        onComplete={() => undefined}
      />
    </Box>
  ),
};

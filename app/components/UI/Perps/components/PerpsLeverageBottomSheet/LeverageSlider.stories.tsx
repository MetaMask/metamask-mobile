/* eslint-disable no-console, react-native/no-inline-styles */
import React, { useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { LeverageSlider } from './PerpsLeverageBottomSheet';
import { useTheme } from '../../../../../util/theme';

function LeverageSliderStory({
  initialValue = 5,
  minValue = 1,
  maxValue = 20,
}: {
  initialValue?: number;
  minValue?: number;
  maxValue?: number;
}) {
  const { colors } = useTheme();
  const [value, setValue] = useState(initialValue);
  const [committedValue, setCommittedValue] = useState(initialValue);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Box twClassName="gap-4 p-4">
        <Text variant={TextVariant.BodyMd}>Leverage: {value}x</Text>
        <Text variant={TextVariant.BodySm}>Committed: {committedValue}x</Text>
        <View style={{ width: '100%' }}>
          <LeverageSlider
            value={value}
            onValueChange={setValue}
            onDragStart={() => undefined}
            onDragEnd={setCommittedValue}
            minValue={minValue}
            maxValue={maxValue}
            colors={colors}
          />
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 8,
            }}
          >
            <Text variant={TextVariant.BodySm}>{minValue}x</Text>
            <Text variant={TextVariant.BodySm}>{maxValue}x</Text>
          </View>
        </View>
      </Box>
    </GestureHandlerRootView>
  );
}

const LeverageSliderMeta = {
  title: 'Components / UI / Sliders / LeverageSlider',
  component: LeverageSliderStory,
};

export default LeverageSliderMeta;

export const Default = {
  render: () => <LeverageSliderStory />,
};

export const HighMaxLeverage = {
  render: () => (
    <LeverageSliderStory initialValue={25} minValue={1} maxValue={50} />
  ),
};

export const LowRange = {
  render: () => (
    <LeverageSliderStory initialValue={2} minValue={1} maxValue={5} />
  ),
};

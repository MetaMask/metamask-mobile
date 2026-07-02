/* eslint-disable no-console, react-native/no-inline-styles */
import React, { useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import SlippageSlider from './index';

const SlippageSliderMeta = {
  title: 'Components / UI / Sliders / SlippageSlider',
  component: SlippageSlider,
};

export default SlippageSliderMeta;

function SlippageSliderStory({
  initialValue = 1,
  disabled = false,
}: {
  initialValue?: number;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Box twClassName="gap-2 p-4">
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          Legacy component — confirmed unused in production. Slippage range
          0.5–5%.
        </Text>
        <Text variant={TextVariant.BodyMd}>Slippage: {value}%</Text>
        <View style={{ width: '100%', paddingVertical: 16 }}>
          <SlippageSlider
            range={[0.5, 5]}
            increment={0.1}
            value={value}
            onChange={setValue}
            formatTooltipText={(text) => `${text}%`}
            disabled={disabled}
          />
        </View>
      </Box>
    </GestureHandlerRootView>
  );
}

export const Default = {
  render: () => <SlippageSliderStory />,
};

export const Disabled = {
  render: () => <SlippageSliderStory initialValue={2.5} disabled />,
};

export const HighSlippage = {
  render: () => <SlippageSliderStory initialValue={4} />,
};

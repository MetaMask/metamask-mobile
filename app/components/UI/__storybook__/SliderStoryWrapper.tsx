/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

interface SliderStoryWrapperProps {
  initialValue?: number;
  label?: string;
  children: (props: {
    value: number;
    onValueChange: (value: number) => void;
    onDragEnd?: (value: number) => void;
  }) => React.ReactNode;
  showCommittedValue?: boolean;
}

export function SliderStoryWrapper({
  initialValue = 50,
  label = 'Value',
  children,
  showCommittedValue = false,
}: SliderStoryWrapperProps) {
  const [value, setValue] = useState(initialValue);
  const [committedValue, setCommittedValue] = useState(initialValue);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Box twClassName="w-full gap-4 p-4">
        <Text variant={TextVariant.BodyMd}>
          {label}: {value}%
        </Text>
        {showCommittedValue ? (
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            Committed: {committedValue}%
          </Text>
        ) : null}
        <View style={{ width: '100%' }}>
          {children({
            value,
            onValueChange: setValue,
            onDragEnd: setCommittedValue,
          })}
        </View>
      </Box>
    </GestureHandlerRootView>
  );
}

interface AmountSliderStoryWrapperProps {
  initialAmount?: number;
  children: (props: {
    amount: number;
    onAmountChange: (amount: number) => void;
  }) => React.ReactNode;
}

export function AmountSliderStoryWrapper({
  initialAmount = 1000,
  children,
}: AmountSliderStoryWrapperProps) {
  const [amount, setAmount] = useState(initialAmount);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Box twClassName="w-full p-4">
        {children({ amount, onAmountChange: setAmount })}
      </Box>
    </GestureHandlerRootView>
  );
}

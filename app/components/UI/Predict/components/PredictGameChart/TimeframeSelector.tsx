import React from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  ChartTimeframe,
  TimeframeSelectorProps,
} from './PredictGameChart.types';

const TIMEFRAMES: { value: ChartTimeframe; label: string }[] = [
  { value: 'live', label: 'Live' },
  { value: '6h', label: '6H' },
  { value: '1d', label: '1D' },
  { value: 'max', label: 'Max' },
];

const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({
  selected,
  onSelect,
  disabled = false,
}) => {
  const tw = useTailwind();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      twClassName="justify-center gap-2 mt-3"
    >
      {TIMEFRAMES.map(({ value, label }) => {
        const isSelected = selected === value;

        return (
          <Pressable
            key={value}
            onPress={() => !disabled && onSelect(value)}
            disabled={disabled}
            style={({ pressed }) =>
              tw.style(
                'px-4 py-2 rounded-md flex-1',
                isSelected ? 'bg-background-pressed' : 'bg-transparent',
                disabled && 'opacity-50',
                pressed && !isSelected && 'bg-background-hover',
              )
            }
          >
            <Text
              variant={TextVariant.BodySm}
              color={
                isSelected ? TextColor.TextDefault : TextColor.TextAlternative
              }
              style={tw.style('text-center')}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </Box>
  );
};

export default TimeframeSelector;

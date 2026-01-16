import React from 'react';
import { Pressable } from 'react-native-gesture-handler';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';

interface TimeframeSelectorProps {
  timeframes: string[];
  selectedTimeframe: string;
  onTimeframeChange: (timeframe: string) => void;
}

const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({
  timeframes,
  selectedTimeframe,
  onTimeframeChange,
}) => {
  const tw = useTailwind();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-1"
      >
        {timeframes.map((timeframe) => (
          <Pressable
            key={timeframe}
            onPress={() => onTimeframeChange(timeframe)}
            style={({ pressed }) =>
              tw.style(
                'flex-1 py-2 rounded-lg',
                selectedTimeframe === timeframe ? 'bg-muted' : 'bg-default',
                pressed && 'bg-pressed',
              )
            }
          >
            <Text
              variant={TextVariant.BodySM}
              color={
                selectedTimeframe === timeframe
                  ? TextColor.Default
                  : TextColor.Alternative
              }
              style={tw.style('text-center')}
            >
              {timeframe.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </Box>
    </Box>
  );
};

export default TimeframeSelector;

import React from 'react';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  MUSD_SLIDER_ROW_HEIGHT,
  MUSD_SLIDER_THUMB_SIZE_REST,
  MUSD_SLIDER_TRACK_HEIGHT,
  useMusdCalculatorSlider,
} from '../../hooks/useMusdCalculatorSlider';
import { formatCompactUsd, formatUsd } from '../../utils/formatUtils';
import { MAX_AMOUNT, MIN_AMOUNT } from '../../utils/musdCalculatorSlider';

export interface MusdCalculatorSliderProps {
  amount: number;
  onAmountChange: (nextAmount: number) => void;
  amountLabel?: string;
  testID?: string;
}

const COMPACT_USD_THRESHOLD = 100_000;

function formatScaleLabel(value: number): string {
  return value >= COMPACT_USD_THRESHOLD
    ? formatCompactUsd(value)
    : formatUsd(value);
}

export function MusdCalculatorSlider({
  amount,
  onAmountChange,
  amountLabel = 'Amount',
  testID = 'musd-calculator-slider',
}: MusdCalculatorSliderProps) {
  const tw = useTailwind();
  const slider = useMusdCalculatorSlider(amount, onAmountChange);

  return (
    <Box twClassName="w-full gap-2">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {amountLabel}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          testID={`${testID}-amount-display`}
        >
          {formatUsd(amount)}
        </Text>
      </Box>

      <GestureDetector gesture={slider.sliderGesture}>
        <Animated.View
          testID={`${testID}-track`}
          accessibilityRole="adjustable"
          accessibilityValue={{ text: formatUsd(amount) }}
          onLayout={slider.handleSliderLayout}
          style={tw.style('h-8 w-full justify-center')}
        >
          <Box
            twClassName="absolute left-0 right-0 rounded-full bg-muted"
            style={{
              height: MUSD_SLIDER_TRACK_HEIGHT,
              top: (MUSD_SLIDER_ROW_HEIGHT - MUSD_SLIDER_TRACK_HEIGHT) / 2,
            }}
          />
          <Animated.View
            style={[
              tw.style('absolute left-0 rounded-full bg-success-default'),
              {
                height: MUSD_SLIDER_TRACK_HEIGHT,
                top: (MUSD_SLIDER_ROW_HEIGHT - MUSD_SLIDER_TRACK_HEIGHT) / 2,
              },
              slider.animatedFillStyle,
            ]}
          />
          <Animated.View
            style={[
              tw.style(
                'absolute rounded-full border-3 border-muted bg-white shadow-md',
              ),
              {
                width: MUSD_SLIDER_THUMB_SIZE_REST,
                height: MUSD_SLIDER_THUMB_SIZE_REST,
                top: (MUSD_SLIDER_ROW_HEIGHT - MUSD_SLIDER_THUMB_SIZE_REST) / 2,
              },
              slider.animatedThumbStyle,
            ]}
          />
        </Animated.View>
      </GestureDetector>

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Start}
        justifyContent={BoxJustifyContent.Between}
        twClassName="mt-1"
      >
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          fontWeight={FontWeight.Medium}
          testID={`${testID}-scale-min`}
        >
          {formatScaleLabel(MIN_AMOUNT)}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          fontWeight={FontWeight.Medium}
          testID={`${testID}-scale-mid`}
        >
          {formatScaleLabel(1_000)}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          fontWeight={FontWeight.Medium}
          testID={`${testID}-scale-max`}
        >
          {formatScaleLabel(MAX_AMOUNT)}
        </Text>
      </Box>
    </Box>
  );
}

import {
  Box,
  BoxAlignItems,
  FontWeight,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { AnimatedAmountDisplay } from '../../../../../component-library/components-temp/AnimatedAmountDisplay';
import { PerpsAmountDisplaySelectorsIDs } from '../../../Perps/Perps.testIds';
import { PREDICT_AMOUNT_DISPLAY_TEST_IDS } from './PredictAmountDisplay.testIds';

interface PredictAmountDisplayProps {
  amount: string;
  onPress?: () => void;
  isActive?: boolean;
  hasError?: boolean;
}

const getFontSizeForInputLength = (contentLength: number) => {
  if (contentLength <= 8) {
    return 60;
  }
  if (contentLength <= 10) {
    return 48;
  }
  if (contentLength <= 12) {
    return 32;
  }
  if (contentLength <= 14) {
    return 24;
  }
  if (contentLength <= 18) {
    return 18;
  }
  return 12;
};

const PredictAmountDisplay: React.FC<PredictAmountDisplayProps> = ({
  amount,
  onPress,
  isActive = false,
  hasError = false,
}) => {
  const tw = useTailwind();

  const amountValue = amount ? `$${amount}` : '$0';
  const fontSize = getFontSizeForInputLength(amountValue.length);
  const lineHeight = fontSize + 10; // Add 10px to font size for line height
  // Match the caret height to the glyph cap height so it reads as part of the typography.
  const cursorHeight = Math.round(fontSize * 0.72);

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      twClassName="px-6"
      testID={PerpsAmountDisplaySelectorsIDs.CONTAINER}
    >
      <AnimatedAmountDisplay
        color={hasError ? TextColor.ErrorDefault : TextColor.TextDefault}
        containerStyle={tw.style('items-center')}
        cursor={
          isActive
            ? {
                testID: PREDICT_AMOUNT_DISPLAY_TEST_IDS.CURSOR,
                style: tw.style(
                  `w-0.5 h-[${cursorHeight}px] ml-0 bg-text-default`,
                ),
              }
            : false
        }
        disabled={!onPress}
        fontWeight={FontWeight.Medium}
        onPress={onPress}
        amountTestID={PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL}
        prefix="$"
        rollDigits={false}
        style={tw.style(
          `text-[${fontSize}px] tracking-tight leading-[${lineHeight}px] font-medium px-1`,
        )}
        value={amount || '0'}
        variant={TextVariant.BodyMd}
      />
    </Box>
  );
};

export default PredictAmountDisplay;

import {
  Box,
  BoxAlignItems,
  FontFamily,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { Platform } from 'react-native';
import { AnimatedAmountDisplay } from '../../../../../component-library/components-temp/AnimatedAmountDisplay';
import { useTheme } from '../../../../../util/theme';
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
    return 64;
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
  const { colors } = useTheme();

  const amountValue = amount ? `$${amount}` : '$0';
  const fontSize = getFontSizeForInputLength(amountValue.length);
  const lineHeight = fontSize;
  // Muted caret at 95% of the font size, nudged so it sits with the glyphs.
  const cursorStyle = {
    marginHorizontal: 0,
    width: 1,
    height: Math.round(fontSize * 0.95),
    backgroundColor: colors.text.muted,
    // Android renders glyphs lower than iOS in a line box equal to fontSize.
    transform: [
      {
        translateY: Math.round(
          fontSize * (Platform.OS === 'android' ? 0.02 : -0.04),
        ),
      },
    ],
  };

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
                style: cursorStyle,
              }
            : false
        }
        fontFamily={FontFamily.Hero}
        onPress={onPress}
        amountTestID={PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL}
        prefix="$"
        style={tw.style(
          `text-[${fontSize}px] tracking-tight leading-[${lineHeight}px]`,
        )}
        value={amount || '0'}
        variant={TextVariant.BodyMd}
      />
    </Box>
  );
};

export default PredictAmountDisplay;

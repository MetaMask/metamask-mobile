import React from 'react';
import { StyleSheet } from 'react-native';
import { TextColor } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';
import {
  AnimatedAmountDisplay,
  getFontSizeForInputLength,
} from '../../../../../component-library/components-temp/AnimatedAmountDisplay';
import {
  getAlertAmountCursorTestId,
  getAlertAmountTestId,
} from './AlertAmountInput.testIds';

const styles = StyleSheet.create({
  container: {
    maxWidth: '100%',
  },
  amountText: {
    flexShrink: 1,
    minWidth: 0,
  },
});

interface AlertAmountInputProps {
  text: string;
  hasInput: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  testID: string;
}

const INPUT_SIDE_MARGIN_CHARACTER_RESERVE = 2;
const PREFIX_CHARACTER_RESERVE = 2;
const SUFFIX_CHARACTER_RESERVE = 1;

const AlertAmountInput: React.FC<AlertAmountInputProps> = ({
  text,
  hasInput,
  prefix,
  suffix,
  testID,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const affixCharacterReserve =
    (prefix ? PREFIX_CHARACTER_RESERVE : 0) +
    (suffix ? SUFFIX_CHARACTER_RESERVE : 0);
  const amountFontSize = getFontSizeForInputLength(
    text.length + INPUT_SIDE_MARGIN_CHARACTER_RESERVE + affixCharacterReserve,
  );
  const cursorStyle = {
    flexShrink: 0,
    marginHorizontal: 0,
    width: 1,
    height: Math.round(amountFontSize * 0.95),
    backgroundColor: colors.text.muted,
    transform: [{ translateY: Math.round(amountFontSize * -0.04) }],
  };

  return (
    <AnimatedAmountDisplay
      accessible={false}
      amountTestID={getAlertAmountTestId(testID)}
      amountAccessible
      animated
      color={hasInput ? TextColor.TextDefault : TextColor.TextAlternative}
      containerStyle={[tw.style('w-full justify-center'), styles.container]}
      cursor={{
        animated: true,
        style: cursorStyle,
        testID: getAlertAmountCursorTestId(testID),
      }}
      prefix={prefix}
      style={[
        tw.style('font-medium'),
        styles.amountText,
        {
          fontSize: amountFontSize,
          lineHeight: amountFontSize,
        },
      ]}
      suffix={suffix}
      testID={testID}
      value={text}
    />
  );
};

export default AlertAmountInput;

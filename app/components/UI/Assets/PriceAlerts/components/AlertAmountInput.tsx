import React from 'react';
import { StyleSheet } from 'react-native';
import { TextColor } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { AnimatedAmountDisplay } from '../../../../../component-library/components-temp/AnimatedAmountDisplay';

const styles = StyleSheet.create({
  amountText: {
    fontSize: 48,
    flexShrink: 1,
    maxWidth: '95%',
  },
  cursor: {
    flexShrink: 0,
  },
});

interface AlertAmountInputProps {
  text: string;
  hasInput: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  testID: string;
  cursorTwClassName?: string;
}

const AlertAmountInput: React.FC<AlertAmountInputProps> = ({
  text,
  hasInput,
  prefix,
  suffix,
  testID,
  cursorTwClassName = 'ml-1 h-10 w-0.5 bg-primary-default',
}) => {
  const tw = useTailwind();
  return (
    <AnimatedAmountDisplay
      animated={false}
      color={hasInput ? TextColor.TextDefault : TextColor.TextAlternative}
      containerStyle={tw.style('w-full')}
      cursor={{
        style: [tw.style(cursorTwClassName), styles.cursor],
      }}
      fitToWidth
      prefix={prefix}
      style={[tw.style('font-medium'), styles.amountText]}
      suffix={suffix}
      testID={testID}
      value={text}
    />
  );
};

export default AlertAmountInput;

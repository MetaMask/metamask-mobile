import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { View } from 'react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import Keypad from '../../../../Base/Keypad';

interface PredictKeypadProps {
  isInputFocused: boolean;
  currentValueUSDString: string;
  onKeypadChange: ({ value }: { value: string; valueAsNumber: number }) => void;
  onKeypadAmountPress: (amount: number) => void;
  onDonePress: () => void;
}

const PredictKeypad: React.FC<PredictKeypadProps> = ({
  isInputFocused,
  currentValueUSDString,
  onKeypadChange,
  onKeypadAmountPress,
  onDonePress,
}) => {
  const tw = useTailwind();

  if (!isInputFocused) return null;

  return (
    <View style={tw.style('pt-4 bg-background-section pb-8 rounded-t-3xl')}>
      <View style={tw.style('flex-row space-between px-4 mb-3 gap-2')}>
        <Button
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Md}
          label="$20"
          onPress={() => onKeypadAmountPress(20)}
          style={tw.style('flex-1')}
        />
        <Button
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Md}
          label="$50"
          onPress={() => onKeypadAmountPress(50)}
          style={tw.style('flex-1')}
        />
        <Button
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Md}
          label="$100"
          onPress={() => onKeypadAmountPress(100)}
          style={tw.style('flex-1')}
        />
        <Button
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Md}
          label="Done"
          onPress={onDonePress}
          style={tw.style('flex-1')}
        />
      </View>
      <Keypad
        value={currentValueUSDString}
        onChange={onKeypadChange}
        currency={'USD'}
        decimals={2}
        style={tw.style('px-4')}
      />
    </View>
  );
};

export default PredictKeypad;

import React from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';

export interface PercentageButtonOption {
  value: number;
  label: string;
}

interface PercentageButtonsProps {
  /**
   * Array of percentage options to display
   */
  options: PercentageButtonOption[];
  /**
   * Callback when a percentage button is pressed
   */
  onPress: (percentage: number) => void;
  /**
   * Test ID prefix for testing
   */
  testID?: string;
}

const PercentageButtons: React.FC<PercentageButtonsProps> = ({
  options,
  onPress,
  testID = 'percentage-buttons',
}) => {
  const tw = useTailwind();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      twClassName="px-4 mb-4 gap-2"
      testID={testID}
    >
      {options.map(({ value, label }) => (
        <Button
          key={value}
          testID={`${testID}-${value}`}
          label={label}
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Md}
          onPress={() => onPress(value)}
          style={tw.style('flex-1 h-12')}
        />
      ))}
    </Box>
  );
};

export default PercentageButtons;

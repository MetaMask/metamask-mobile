/* eslint-disable no-console */
// Third party dependencies
import React, { useState } from 'react';

// External dependencies
import {
  Box,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';

// Internal dependencies
import QuickActionButtons, { QuickActionButton } from './QuickActionButtons';
import Keypad from '../../../components/Base/Keypad';

const QuickActionButtonsMeta = {
  title: 'Components Temp / QuickActionButtons',
  component: QuickActionButtons,
  argTypes: {
    buttonsPerRow: {
      control: { type: 'number', min: 1, max: 6 },
      description: 'Number of buttons per row',
    },
  },
};

export default QuickActionButtonsMeta;

// Basic story with default props
export const Default = {
  render: function Render(args: { buttonsPerRow?: number }) {
    return (
      <QuickActionButtons {...args}>
        <QuickActionButton onPress={() => console.log('10% pressed')}>
          10%
        </QuickActionButton>
        <QuickActionButton onPress={() => console.log('25% pressed')}>
          25%
        </QuickActionButton>
        <QuickActionButton onPress={() => console.log('50% pressed')}>
          Max
        </QuickActionButton>
        <QuickActionButton onPress={() => console.log('Done pressed')}>
          Done
        </QuickActionButton>
      </QuickActionButtons>
    );
  },
  args: {
    buttonsPerRow: 4,
  },
};

// Different layouts
export const ButtonsPerRow = {
  render: function Render() {
    return (
      <Box padding={4} gap={6}>
        <Box>
          <Text variant={TextVariant.HeadingSm} twClassName="mb-2">
            2 Buttons Per Row
          </Text>
          <QuickActionButtons buttonsPerRow={2}>
            <QuickActionButton onPress={() => console.log('10% pressed')}>
              10%
            </QuickActionButton>
            <QuickActionButton onPress={() => console.log('25% pressed')}>
              25%
            </QuickActionButton>
            <QuickActionButton onPress={() => console.log('50% pressed')}>
              50%
            </QuickActionButton>
            <QuickActionButton onPress={() => console.log('75% pressed')}>
              75%
            </QuickActionButton>
            <QuickActionButton onPress={() => console.log('Max pressed')}>
              Max
            </QuickActionButton>
          </QuickActionButtons>
        </Box>
        <Box>
          <Text variant={TextVariant.HeadingSm} twClassName="mb-2">
            3 Buttons Per Row
          </Text>
          <QuickActionButtons buttonsPerRow={3}>
            <QuickActionButton onPress={() => console.log('10% pressed')}>
              10%
            </QuickActionButton>
            <QuickActionButton onPress={() => console.log('25% pressed')}>
              25%
            </QuickActionButton>
            <QuickActionButton onPress={() => console.log('50% pressed')}>
              50%
            </QuickActionButton>
            <QuickActionButton onPress={() => console.log('75% pressed')}>
              75%
            </QuickActionButton>
            <QuickActionButton onPress={() => console.log('Max pressed')}>
              Max
            </QuickActionButton>
          </QuickActionButtons>
        </Box>

        <Box>
          <Text variant={TextVariant.HeadingSm} twClassName="mb-2">
            5 Buttons Per Row
          </Text>
          <QuickActionButtons buttonsPerRow={5}>
            <QuickActionButton onPress={() => console.log('10% pressed')}>
              10%
            </QuickActionButton>
            <QuickActionButton onPress={() => console.log('25% pressed')}>
              25%
            </QuickActionButton>
            <QuickActionButton onPress={() => console.log('50% pressed')}>
              50%
            </QuickActionButton>
            <QuickActionButton onPress={() => console.log('75% pressed')}>
              75%
            </QuickActionButton>
            <QuickActionButton onPress={() => console.log('Max pressed')}>
              Max
            </QuickActionButton>
          </QuickActionButtons>
        </Box>
      </Box>
    );
  },
};

// Usage with actual Keypad component
const WithKeypadComponent = () => {
  const [amount, setAmount] = useState('0');
  const maxBalance = 1000;

  const handleKeypadChange = (data: {
    value: string;
    valueAsNumber: number;
  }) => {
    setAmount(data.value);
  };

  const handlePercentagePress = (percentage: number) => {
    const calculatedAmount = (maxBalance * percentage) / 100;
    setAmount(calculatedAmount.toFixed(2));
  };

  const handleMaxPress = () => {
    setAmount(maxBalance.toFixed(2));
  };

  const handleMinPress = () => {
    setAmount('0.01');
  };

  return (
    <Box padding={4} gap={4}>
      <Box twClassName="bg-default border border-muted rounded-lg p-4">
        <Text variant={TextVariant.HeadingMd} twClassName="text-center">
          ${amount}
        </Text>
      </Box>

      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        twClassName="text-center"
      >
        Balance: ${maxBalance.toFixed(2)}
      </Text>

      <QuickActionButtons>
        <QuickActionButton onPress={() => handlePercentagePress(10)}>
          10%
        </QuickActionButton>
        <QuickActionButton onPress={() => handlePercentagePress(25)}>
          25%
        </QuickActionButton>
        <QuickActionButton onPress={() => handleMaxPress()}>
          Max
        </QuickActionButton>
        <QuickActionButton onPress={() => handleMinPress()}>
          Done
        </QuickActionButton>
      </QuickActionButtons>

      <Keypad currency="USD" value={amount} onChange={handleKeypadChange} />
    </Box>
  );
};

export const WithKeypad = {
  render: () => <WithKeypadComponent />,
};

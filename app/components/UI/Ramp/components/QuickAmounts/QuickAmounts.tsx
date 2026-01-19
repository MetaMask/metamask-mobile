import React from 'react';
import { View } from 'react-native';

import {
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../component-library/hooks';

import styleSheet from './QuickAmounts.styles';

const DEFAULT_AMOUNTS = [50, 100, 200, 400];

export interface QuickAmountsProps {
  /** Array of preset amounts to display */
  amounts?: number[];
  /** Currency symbol for formatting */
  currencySymbol?: string;
  /** Callback when an amount is pressed */
  onAmountPress: (amount: number) => void;
  /** Test ID prefix for testing */
  testID?: string;
}

const QuickAmounts: React.FC<QuickAmountsProps> = ({
  amounts = DEFAULT_AMOUNTS,
  currencySymbol = '$',
  onAmountPress,
  testID = 'quick-amounts',
}) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.container} testID={testID}>
      {amounts.map((amount) => (
        <View key={amount} style={styles.buttonWrapper}>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            onPress={() => onAmountPress(amount)}
            testID={`${testID}-button-${amount}`}
            isFullWidth
          >
            {`${currencySymbol}${amount}`}
          </Button>
        </View>
      ))}
    </View>
  );
};

export default QuickAmounts;

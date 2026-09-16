import React from 'react';
import { TextInput, View } from 'react-native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import { useTheme } from '../../../../../../util/theme';

import { PredictOrderFlowTestIds } from './PredictOrderFlow.testIds';

const QUICK_AMOUNTS = ['$20', '$50', '$100', '$250'] as const;

interface OrderAmountInputProps {
  amount: string;
  onAmountChange: (amount: string) => void;
}

/** USD amount entry with legacy-referenced quick amount chips. */
export const OrderAmountInput = ({
  amount,
  onAmountChange,
}: OrderAmountInputProps) => {
  const tw = useTailwind();
  const { colors, themeAppearance } = useTheme();

  return (
    <Box twClassName="gap-4">
      <Box
        twClassName="flex-row items-center justify-center gap-1"
        testID={PredictOrderFlowTestIds.AMOUNT_INPUT}
      >
        <Text variant={TextVariant.HeadingLg}>$</Text>
        <TextInput
          style={tw.style(
            'text-center text-[32px] font-bold text-default h-12 min-w-0 flex-1',
          )}
          value={amount}
          onChangeText={onAmountChange}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.text.alternative}
          keyboardAppearance={themeAppearance}
          accessible
          accessibilityLabel={strings('predict_next.order_preview.amount')}
        />
      </Box>
      <View style={tw.style('flex-row gap-2')}>
        {QUICK_AMOUNTS.map((quickAmount) => (
          <Button
            key={quickAmount}
            testID={PredictOrderFlowTestIds.QUICK_AMOUNT(quickAmount)}
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            onPress={() => onAmountChange(quickAmount.replace('$', ''))}
            twClassName="h-11 flex-1 min-w-0"
          >
            <Text>{quickAmount}</Text>
          </Button>
        ))}
      </View>
      <Text
        variant={TextVariant.BodyXs}
        twClassName="text-center text-alternative"
      >
        {strings('predict_next.order_preview.max_spend_hint')}
      </Text>
    </Box>
  );
};

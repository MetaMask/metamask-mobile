import React from 'react';
import BigNumber from 'bignumber.js';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import type { PredictAmount } from '../../../types';

import { PredictOrderFlowTestIds } from './PredictOrderFlow.testIds';

/** Quick-buy fractions of the available Predictions balance. Max is kept
 * apart: the sheet clamps it so the fee on top still fits the balance. */
const QUICK_AMOUNT_FRACTIONS = [
  { key: '25', label: '25%', fraction: 0.25 },
  { key: '50', label: '50%', fraction: 0.5 },
  { key: '75', label: '75%', fraction: 0.75 },
] as const;

/** A fraction of the balance, floored to whole cents so a chip never asks
 * for more than the balance holds. */
export const fractionOfBalance = (
  balance: PredictAmount,
  fraction: number,
): BigNumber =>
  new BigNumber(balance).times(fraction).decimalPlaces(2, BigNumber.ROUND_DOWN);

interface OrderQuickAmountsProps {
  /** The available Predictions balance the chips are fractions of. Absent
   * while it loads, which disables every chip. */
  balance?: PredictAmount;
  /** The smallest quotable amount: a chip below it is disabled. */
  minimumAmount: number;
  /** Sets the entered amount to the pressed fraction chip's value. */
  onSetAmount: (amount: BigNumber) => void;
  /** Sets the entered amount to the whole balance, clamped by the sheet. */
  onMax: () => void;
  /** Disables chips while a quote is being submitted. */
  isDisabled?: boolean;
}

/**
 * The quick-buy chips beneath the amount: 25%, 50% and 75% of the available
 * Predictions balance, plus Max. Like the quick-sell chips they set (not add
 * to) the entered amount. A chip whose value falls below the minimum amount
 * would only trigger the minimum error, so it is disabled.
 */
export const OrderQuickAmounts = ({
  balance,
  minimumAmount,
  onSetAmount,
  onMax,
  isDisabled = false,
}: OrderQuickAmountsProps) => {
  const isBelowMinimum = (fraction: number) =>
    balance === undefined ||
    fractionOfBalance(balance, fraction).lt(minimumAmount);

  return (
    <Box twClassName="flex-row gap-2">
      {QUICK_AMOUNT_FRACTIONS.map(({ key, label, fraction }) => (
        <Button
          key={key}
          testID={PredictOrderFlowTestIds.QUICK_AMOUNT(key)}
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          isDisabled={isDisabled || isBelowMinimum(fraction)}
          onPress={() =>
            balance !== undefined &&
            onSetAmount(fractionOfBalance(balance, fraction))
          }
          twClassName="h-12 flex-1 min-w-0 rounded-full"
        >
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {label}
          </Text>
        </Button>
      ))}
      <Button
        testID={PredictOrderFlowTestIds.QUICK_AMOUNT('max')}
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        isDisabled={isDisabled || isBelowMinimum(1)}
        onPress={onMax}
        twClassName="h-12 flex-1 min-w-0 rounded-full"
      >
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {strings('predict_next.order_preview.max')}
        </Text>
      </Button>
    </Box>
  );
};

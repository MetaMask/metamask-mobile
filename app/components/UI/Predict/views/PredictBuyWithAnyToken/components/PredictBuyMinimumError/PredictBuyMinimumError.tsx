import React from 'react';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../../locales/i18n';
import { formatPrice } from '../../../../utils/format';
import { MINIMUM_BET } from '../../../../constants/transactions';

interface PredictBuyMinimumErrorProps {
  isBalanceLoading: boolean;
  isBelowMinimum: boolean;
  isInsufficientBalance: boolean;
  maxBetAmount: number;
}

const PredictBuyMinimumError = ({
  isBalanceLoading,
  isBelowMinimum,
  isInsufficientBalance,
  maxBetAmount,
}: PredictBuyMinimumErrorProps) => {
  const tw = useTailwind();

  if (isBalanceLoading) return null;

  if (isBelowMinimum) {
    return (
      <Box twClassName="px-12 pb-4">
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.ErrorDefault}
          style={tw.style('text-center')}
        >
          {strings('predict.order.prediction_minimum_bet', {
            amount: formatPrice(MINIMUM_BET, {
              minimumDecimals: 2,
              maximumDecimals: 2,
            }),
          })}
        </Text>
      </Box>
    );
  }

  if (isInsufficientBalance) {
    const formattedMax = formatPrice(maxBetAmount, {
      minimumDecimals: 2,
      maximumDecimals: 2,
    });

    return (
      <Box twClassName="px-12 pb-4">
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.ErrorDefault}
          style={tw.style('text-center')}
        >
          {maxBetAmount >= MINIMUM_BET
            ? strings('predict.order.prediction_insufficient_funds', {
                amount: formattedMax,
              })
            : strings('predict.order.no_funds_enough')}
        </Text>
      </Box>
    );
  }

  return null;
};

export default PredictBuyMinimumError;

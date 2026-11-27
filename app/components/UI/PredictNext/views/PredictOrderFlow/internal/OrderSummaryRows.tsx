import React from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';

import { PredictOrderFlowTestIds } from './PredictOrderFlow.testIds';

interface OrderSummaryRowsProps {
  /** The formatted Predictions balance backing the order, when loaded. */
  balance?: string;
}

/**
 * The Pay with row beneath the amount: a static Predictions-balance display.
 * There is one funding source today, so the row does not respond to presses.
 */
export const OrderSummaryRows = ({ balance }: OrderSummaryRowsProps) => (
  <Box className="flex-row items-center justify-between gap-4 py-2">
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Regular}
      color={TextColor.TextAlternative}
      className="shrink-0"
    >
      {strings('predict_next.order_preview.pay_with')}
    </Text>
    {/* TODO(PRED): Take the balance label from the backend balance payload
     * (pUSD for Polymarket, base USDC for Kalshi) once it carries one. */}
    <Box
      className="min-w-0 shrink items-end"
      testID={PredictOrderFlowTestIds.PAY_WITH}
    >
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Regular}
        color={TextColor.TextDefault}
        numberOfLines={1}
      >
        {strings('predict_next.order_preview.predictions_balance')}
        {balance ? (
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Regular}
            color={TextColor.TextAlternative}
          >
            {` ($${balance})`}
          </Text>
        ) : null}
      </Text>
    </Box>
  </Box>
);

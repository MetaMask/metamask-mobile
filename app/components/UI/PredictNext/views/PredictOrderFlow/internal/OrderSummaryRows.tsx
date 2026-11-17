import React from 'react';
import {
  Box,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
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
 * There is one funding source today, so the trailing chevron is decorative
 * and the row does not respond to presses.
 */
export const OrderSummaryRows = ({ balance }: OrderSummaryRowsProps) => (
  <Box twClassName="flex-row items-center justify-between gap-4 py-2">
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextAlternative}
    >
      {strings('predict_next.order_preview.pay_with')}
    </Text>
    {/* TODO(PRED): Take the balance label from the backend balance payload
     * (pUSD for Polymarket, base USDC for Kalshi) once it carries one. */}
    <Box
      twClassName="min-w-0 flex-row items-center gap-1"
      testID={PredictOrderFlowTestIds.PAY_WITH}
    >
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
        numberOfLines={1}
      >
        {strings('predict_next.order_preview.predictions_balance')}
        {balance ? (
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {` ($${balance})`}
          </Text>
        ) : null}
      </Text>
      <Icon
        name={IconName.ArrowDown}
        size={IconSize.Sm}
        color={IconColor.IconAlternative}
      />
    </Box>
  </Box>
);

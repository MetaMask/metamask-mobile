import React from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { Skeleton } from '../../../../../../component-library/components-temp/Skeleton';
import { strings } from '../../../../../../../locales/i18n';
import { formatUsd } from '../../../utils/formatUsd';

import { PredictOrderFlowTestIds } from './PredictOrderFlow.testIds';

interface OrderSummaryRowsProps {
  /** The formatted Predictions balance backing the order, when loaded. */
  balance?: string;
  /** The signed maximum cost of the quoted buy, once the phone has checked
   * what it would sign. */
  maxCost?: string;
  /** A quote is on its way, so the maximum cost is not known yet. */
  isMaxCostLoading?: boolean;
}

/**
 * The rows beneath the amount on the buy sheet.
 *
 * Pay with is a static Predictions-balance display. There is one funding
 * source today, so the row has no chevron and does not respond to presses.
 * Add both when a second funding source exists.
 *
 * Maximum cost (signed) is the worst case the phone signs (ADR-0004), shown
 * before Buy because the Buy tap approves it. A dash stands in until the
 * phone has checked a quote.
 */
export const OrderSummaryRows = ({
  balance,
  maxCost,
  isMaxCostLoading = false,
}: OrderSummaryRowsProps) => (
  <>
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
        className="min-w-0 shrink flex-row items-center justify-end"
        testID={PredictOrderFlowTestIds.PAY_WITH}
      >
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Regular}
          color={TextColor.TextDefault}
          numberOfLines={1}
          ellipsizeMode="tail"
          className="min-w-0 shrink"
        >
          {strings('predict_next.order_preview.predictions_balance')}
        </Text>
        {balance ? (
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Regular}
            color={TextColor.TextAlternative}
            numberOfLines={1}
            className="shrink-0"
          >
            {` ($${balance})`}
          </Text>
        ) : null}
      </Box>
    </Box>
    <Box className="flex-row items-center justify-between gap-4 py-2">
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Regular}
        color={TextColor.TextAlternative}
        className="shrink-0"
      >
        {strings('predict_next.order_preview.max_cost')}
      </Text>
      {isMaxCostLoading ? (
        <Skeleton width={64} height={20} />
      ) : (
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Regular}
          color={TextColor.TextDefault}
          testID={PredictOrderFlowTestIds.MAX_COST}
        >
          {maxCost ? formatUsd(maxCost) : '—'}
        </Text>
      )}
    </Box>
  </>
);

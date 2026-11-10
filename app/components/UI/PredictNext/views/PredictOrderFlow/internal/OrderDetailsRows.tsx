import React from 'react';
import BigNumber from 'bignumber.js';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import type { PredictBuyOrderPreview, PredictDecimal } from '../../../types';
import { formatCents } from '../../../utils/formatCents';
import { formatUsd } from '../../../utils/formatUsd';

import { PredictOrderFlowTestIds } from './PredictOrderFlow.testIds';

/** A price in [0, 1] as odds, with formatCents' rounding: '0.53' → '53%',
 * '0.4651' → '46.5%'. */
const formatOdds = (price: PredictDecimal): string => {
  const percent = new BigNumber(price).times(100);
  if (percent.isNaN()) {
    return '0%';
  }
  const rounded = percent.decimalPlaces(1);
  return `${rounded.toFixed(rounded.isInteger() ? 0 : 1)}%`;
};

interface DetailsRowProps {
  label: string;
  value: string;
  testID: string;
  valueColor?: TextColor;
}

/** One 56px details row: muted key on the left, value on the right. */
const DetailsRow = ({
  label,
  value,
  testID,
  valueColor = TextColor.TextDefault,
}: DetailsRowProps) => (
  <Box twClassName="h-14 flex-row items-center justify-between gap-4">
    <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
      {label}
    </Text>
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      color={valueColor}
      testID={testID}
    >
      {value}
    </Text>
  </Box>
);

/**
 * The buy details sheet's five rows, read verbatim from the quoted Preview.
 * Deliberately separate from OrderPreviewRows, which the approval step also
 * renders with the full breakdown and the total debit.
 *
 * - Odds: the quoted average price as a percentage.
 * - Contracts: the quoted contract estimate.
 * - Fees: the quoted fee.
 * - You'll receive: the quoted order amount with the average price. It is
 * the spend that buys contracts; the fee is charged on top of it.
 * - Est. payout: the quoted potential payout.
 */
export const OrderDetailsRows = ({
  preview,
}: {
  preview: PredictBuyOrderPreview;
}) => (
  <Box testID={PredictOrderFlowTestIds.DETAILS}>
    <DetailsRow
      label={strings('predict_next.order_preview.odds')}
      value={formatOdds(preview.averagePrice)}
      testID={PredictOrderFlowTestIds.DETAILS_ODDS}
    />
    <DetailsRow
      label={strings('predict_next.order_preview.contracts_row')}
      value={String(preview.estimatedContracts)}
      testID={PredictOrderFlowTestIds.DETAILS_CONTRACTS}
    />
    <DetailsRow
      label={strings('predict_next.order_preview.fees')}
      value={formatUsd(preview.fee)}
      testID={PredictOrderFlowTestIds.DETAILS_FEES}
    />
    <DetailsRow
      label={strings('predict_next.order_preview.you_will_receive')}
      value={strings('predict_next.order_preview.you_will_receive_value', {
        amount: formatUsd(preview.orderAmount),
        price: formatCents(preview.averagePrice),
      })}
      testID={PredictOrderFlowTestIds.DETAILS_RECEIVE}
    />
    <DetailsRow
      label={strings('predict_next.order_preview.estimated_payout')}
      value={formatUsd(preview.potentialPayout)}
      testID={PredictOrderFlowTestIds.DETAILS_PAYOUT}
      valueColor={TextColor.SuccessDefault}
    />
  </Box>
);

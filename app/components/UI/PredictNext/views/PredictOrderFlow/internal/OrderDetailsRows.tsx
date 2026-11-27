import React from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import type { PredictOrderPreview } from '../../../types';
import { formatCents } from '../../../utils/formatCents';
import { formatUsd } from '../../../utils/formatUsd';

import { PredictOrderFlowTestIds } from './PredictOrderFlow.testIds';

interface FeeRowProps {
  title: string;
  description?: string;
  amount: string;
  testID: string;
}

const FeeRow = ({ title, description, amount, testID }: FeeRowProps) => (
  <>
    <Box twClassName="flex-row items-start py-4">
      <Box twClassName="flex-1 pr-4 gap-1">
        <Text color={TextColor.TextDefault} variant={TextVariant.BodyMd}>
          {title}
        </Text>
        {description ? (
          <Text color={TextColor.TextAlternative} variant={TextVariant.BodySm}>
            {description}
          </Text>
        ) : null}
      </Box>
      <Text
        color={TextColor.TextDefault}
        variant={TextVariant.BodyMd}
        testID={testID}
      >
        {amount}
      </Text>
    </Box>
    <Box twClassName="border-t border-muted" />
  </>
);

/**
 * The Price details sheet's rows, matching Legacy's layout and reading
 * quoted values verbatim from the Preview. A buy and a Cash Out share the
 * row list; only the order and total figures differ by action.
 *
 * - Prediction order: contracts, per-contract average price, and the order cost (buy) or gross Proceeds (sell).
 * - MetaMask fee / Exchange fee: from `preview.feeBreakdown` when present, falling back to a single Fees row using `preview.fee` when absent/empty.
 * - Total: bold `totalDebit` (buy) or `estimatedNetProceeds` (sell), plus the partial-fill disclaimer note.
 */
export const OrderDetailsRows = ({
  preview,
}: {
  preview: PredictOrderPreview;
}) => {
  const orderAmount =
    preview.action === 'buy' ? preview.orderAmount : preview.estimatedProceeds;
  const total =
    preview.action === 'buy'
      ? preview.totalDebit
      : preview.estimatedNetProceeds;
  const metamaskFee = preview.feeBreakdown?.find(
    (component) => component.source === 'metamask',
  );
  const exchangeFee = preview.feeBreakdown?.find(
    (component) => component.source === 'venue',
  );
  const hasFeeBreakdown =
    metamaskFee !== undefined || exchangeFee !== undefined;

  return (
    <Box testID={PredictOrderFlowTestIds.DETAILS}>
      <FeeRow
        title={strings('predict.fee_summary.prediction_order')}
        description={strings(
          'predict_next.order_preview.prediction_order_description',
          {
            count: String(preview.estimatedContracts),
            price: formatCents(preview.averagePrice),
          },
        )}
        amount={formatUsd(orderAmount)}
        testID={PredictOrderFlowTestIds.DETAILS_ORDER_AMOUNT}
      />

      {hasFeeBreakdown ? (
        <>
          {metamaskFee ? (
            <FeeRow
              title={strings('predict.fee_summary.metamask_fee')}
              description={strings(
                'predict.fee_summary.metamask_fee_description',
              )}
              amount={formatUsd(metamaskFee.amount)}
              testID={PredictOrderFlowTestIds.DETAILS_METAMASK_FEE}
            />
          ) : null}
          {exchangeFee ? (
            <FeeRow
              title={strings('predict.fee_summary.exchange_fee')}
              description={strings(
                'predict.fee_summary.exchange_fee_description',
              )}
              amount={formatUsd(exchangeFee.amount)}
              testID={PredictOrderFlowTestIds.DETAILS_EXCHANGE_FEE}
            />
          ) : null}
        </>
      ) : (
        <FeeRow
          title={strings('predict_next.order_preview.fees')}
          amount={formatUsd(preview.fee)}
          testID={PredictOrderFlowTestIds.DETAILS_FEES}
        />
      )}

      <Box twClassName="flex-row justify-between items-center pt-4">
        <Text
          color={TextColor.TextDefault}
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Bold}
        >
          {strings('predict.fee_summary.total')}
        </Text>
        <Text
          color={TextColor.TextDefault}
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Bold}
          testID={PredictOrderFlowTestIds.DETAILS_TOTAL}
        >
          {formatUsd(total)}
        </Text>
      </Box>

      <Text
        testID={PredictOrderFlowTestIds.DETAILS_PARTIAL_FILL_NOTE}
        color={TextColor.TextAlternative}
        variant={TextVariant.BodySm}
        className="pt-2"
      >
        {strings('predict.fee_summary.fak_partial_fill_note')}
      </Text>
    </Box>
  );
};

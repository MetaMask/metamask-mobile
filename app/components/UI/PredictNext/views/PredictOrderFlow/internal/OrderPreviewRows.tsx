import React from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import type {
  PredictOrderPreview,
  PredictOrderPreviewFeeSource,
} from '../../../types';
import { formatCents } from '../../../utils/formatCents';
import { formatUsd } from '../../../utils/formatUsd';

import { OrderDataRow } from './OrderDataRow';
import { PredictOrderFlowTestIds } from './PredictOrderFlow.testIds';

/** Localized fee name per server-quoted fee source. Exhaustive over the
 * source union: a new backend source must be mapped here to render. */
const FEE_SOURCE_LABELS: Record<PredictOrderPreviewFeeSource, string> = {
  venue: 'exchange_fee',
  metamask: 'metamask_fee',
};

const QuoteRow = OrderDataRow;

/** Server-quoted preview rows: distinct canonical values, verbatim. */
export const OrderPreviewRows = ({
  preview,
}: {
  preview: PredictOrderPreview;
}) => (
  <Box twClassName="gap-2" testID={PredictOrderFlowTestIds.QUOTE}>
    <QuoteRow
      label={strings('predict_next.order_preview.estimated_contracts')}
      value={String(preview.estimatedContracts)}
      testID={PredictOrderFlowTestIds.ESTIMATED_CONTRACTS}
    />
    <QuoteRow
      label={strings('predict_next.order_preview.average_price')}
      value={formatCents(preview.averagePrice)}
      testID={PredictOrderFlowTestIds.AVERAGE_PRICE}
    />
    <QuoteRow
      label={strings('predict_next.order_preview.potential_payout')}
      value={formatUsd(preview.potentialPayout)}
      testID={PredictOrderFlowTestIds.POTENTIAL_PAYOUT}
      valueColor={TextColor.SuccessDefault}
    />
    <QuoteRow
      label={strings('predict_next.order_preview.potential_profit')}
      value={formatUsd(preview.potentialProfit)}
      testID={PredictOrderFlowTestIds.POTENTIAL_PROFIT}
      valueColor={
        preview.potentialProfit.startsWith('-')
          ? TextColor.ErrorDefault
          : TextColor.SuccessDefault
      }
    />
    <Box twClassName="gap-1">
      <QuoteRow
        label={strings('predict_next.order_preview.fee')}
        value={formatUsd(preview.fee)}
        testID={PredictOrderFlowTestIds.FEE}
      />
      {preview.feeBreakdown.map((component) => (
        <QuoteRow
          key={component.source}
          label={strings(
            `predict_next.order_preview.${FEE_SOURCE_LABELS[component.source]}`,
          )}
          value={formatUsd(component.amount)}
          testID={PredictOrderFlowTestIds.FEE_COMPONENT(component.source)}
        />
      ))}
    </Box>
    <Box twClassName="mt-1 flex-row items-center justify-between gap-4 border-t border-muted pt-3">
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
        {strings('predict_next.order_preview.total_debit')}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Bold}
        testID={PredictOrderFlowTestIds.TOTAL_DEBIT}
      >
        {formatUsd(preview.totalDebit)}
      </Text>
    </Box>
  </Box>
);

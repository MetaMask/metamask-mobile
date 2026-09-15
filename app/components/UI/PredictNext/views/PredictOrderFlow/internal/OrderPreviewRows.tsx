import React from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import type { PredictOrderPreview } from '../../../types';

import { PredictOrderFlowTestIds } from './PredictOrderFlow.testIds';

const formatUsd = (value: string): string => `$${value}`;

const QuoteRow = ({
  label,
  value,
  testID,
  valueColor,
  bold = false,
}: {
  label: string;
  value: string;
  testID?: string;
  valueColor?: TextColor;
  bold?: boolean;
}) => (
  <Box twClassName="flex-row items-center justify-between gap-4">
    <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
      {label}
    </Text>
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={bold ? FontWeight.Bold : FontWeight.Medium}
      color={valueColor}
      testID={testID}
    >
      {value}
    </Text>
  </Box>
);

/** Server-quoted preview rows: distinct canonical values, verbatim. */
export const OrderPreviewRows = ({
  preview,
}: {
  preview: PredictOrderPreview;
}) => {
  const tw = useTailwind();

  return (
    <Box twClassName="gap-2" testID={PredictOrderFlowTestIds.QUOTE}>
      <QuoteRow
        label={strings('predict_next.order_preview.estimated_contracts')}
        value={String(preview.estimatedContracts)}
        testID={PredictOrderFlowTestIds.ESTIMATED_CONTRACTS}
      />
      <QuoteRow
        label={strings('predict_next.order_preview.average_price')}
        value={formatUsd(preview.averagePrice)}
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
            key={component.label}
            label={component.label}
            value={formatUsd(component.amount)}
            testID={PredictOrderFlowTestIds.FEE_COMPONENT(component.label)}
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
};

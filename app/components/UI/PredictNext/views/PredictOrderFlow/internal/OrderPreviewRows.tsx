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

import type { InvariantDisplay } from '../../../auth/signing/venueTemplates';
import { OrderDataRow } from './OrderDataRow';
import { PredictOrderFlowTestIds } from './PredictOrderFlow.testIds';

/** Localized fee name per server-quoted fee source. Exhaustive over the
 * source union: a new backend source must be mapped here to render. */
const FEE_SOURCE_LABELS: Record<PredictOrderPreviewFeeSource, string> = {
  venue: 'exchange_fee',
  metamask: 'metamask_fee',
};

const QuoteRow = OrderDataRow;

/** Whole cents of a `0.00` dollar string from the invariant display. */
const displayCents = (dollars: string): bigint => {
  const [whole = '0', fraction = ''] = dollars.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2));
};

const centsToDollars = (cents: bigint): string => {
  const sign = cents < 0n ? '-' : '';
  const magnitude = cents < 0n ? -cents : cents;
  return `${sign}${magnitude / 100n}.${(magnitude % 100n)
    .toString()
    .padStart(2, '0')}`;
};

/** The emphasized Total row shared by both actions: Total Debit for a buy,
 * its Net Proceeds mirror for a sell. */
const EmphasizedTotalRow = ({
  label,
  value,
  testID,
}: {
  label: string;
  value: string;
  testID: string;
}) => (
  <Box twClassName="mt-1 flex-row items-center justify-between gap-4 border-t border-muted pt-3">
    <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
      {label}
    </Text>
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Bold}
      testID={testID}
    >
      {value}
    </Text>
  </Box>
);

/**
 * Buy Preview rows. The payout, profit and total come from the invariant
 * display, the worst case the signature allows. Prices and fees are the
 * server's quote.
 */
const BuyPreviewRows = ({
  preview,
  display,
}: {
  preview: PredictOrderPreview;
  display?: InvariantDisplay;
}) => {
  if (preview.action !== 'buy') {
    return null;
  }
  const payout = display?.payout ?? preview.potentialPayout;
  const profit = display
    ? centsToDollars(
        displayCents(display.payout) - displayCents(display.maxCost),
      )
    : preview.potentialProfit;
  return (
    <>
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
        value={formatUsd(payout)}
        testID={PredictOrderFlowTestIds.POTENTIAL_PAYOUT}
        valueColor={TextColor.SuccessDefault}
      />
      <QuoteRow
        label={strings('predict_next.order_preview.potential_profit')}
        value={formatUsd(profit)}
        testID={PredictOrderFlowTestIds.POTENTIAL_PROFIT}
        valueColor={
          profit.startsWith('-')
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
      <EmphasizedTotalRow
        label={strings(
          display
            ? 'predict_next.order_preview.max_cost'
            : 'predict_next.order_preview.total_debit',
        )}
        value={formatUsd(display?.maxCost ?? preview.totalDebit)}
        testID={PredictOrderFlowTestIds.TOTAL_DEBIT}
      />
    </>
  );
};

/** Sell Preview rows: the Cash Out mirror of the buy rows. The emphasized
 * total is the invariant's minimum proceeds when there is a display. */
const SellPreviewRows = ({
  preview,
  display,
}: {
  preview: PredictOrderPreview;
  display?: InvariantDisplay;
}) => {
  if (preview.action !== 'sell') {
    return null;
  }
  return (
    <>
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
        label={strings('predict_next.order_preview.limit_price')}
        value={formatCents(preview.limitPrice)}
        testID={PredictOrderFlowTestIds.LIMIT_PRICE}
      />
      <QuoteRow
        label={strings('predict_next.order_preview.proceeds')}
        value={formatUsd(preview.estimatedProceeds)}
        testID={PredictOrderFlowTestIds.PROCEEDS}
        valueColor={TextColor.SuccessDefault}
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
      <EmphasizedTotalRow
        label={strings(
          display
            ? 'predict_next.order_preview.min_proceeds'
            : 'predict_next.order_preview.net_proceeds',
        )}
        value={formatUsd(display?.minProceeds ?? preview.estimatedNetProceeds)}
        testID={PredictOrderFlowTestIds.NET_PROCEEDS}
      />
    </>
  );
};

/** Preview rows for the quoted Order Action. Totals come from the signing
 * invariant's display when there is one (ADR-0004). */
export const OrderPreviewRows = ({
  preview,
  display,
}: {
  preview: PredictOrderPreview;
  /** The bound the signing invariant computed for this order. */
  display?: InvariantDisplay;
}) => (
  <Box twClassName="gap-2" testID={PredictOrderFlowTestIds.QUOTE}>
    <BuyPreviewRows preview={preview} display={display} />
    <SellPreviewRows preview={preview} display={display} />
  </Box>
);

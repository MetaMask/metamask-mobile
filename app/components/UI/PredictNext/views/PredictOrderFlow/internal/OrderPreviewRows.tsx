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
import type { InvariantDisplay } from '../../../auth/signing/profileTemplates';
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

/** Server-quoted buy Preview rows without the Total: a signed view swaps
 * the Total for the invariant bound, so the quoted row must be omittable. */
const BuyPreviewRows = ({
  preview,
  withTotal = true,
}: {
  preview: PredictOrderPreview;
  withTotal?: boolean;
}) => {
  if (preview.action !== 'buy') {
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
        label={strings('predict_next.order_preview.potential_payout')}
        value={formatUsd(preview.potentialPayout)}
        testID={PredictOrderFlowTestIds.POTENTIAL_PAYOUT}
        valueColor={TextColor.SuccessDefault}
      />
      {withTotal ? (
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
      ) : null}
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
      {withTotal ? (
        <EmphasizedTotalRow
          label={strings('predict_next.order_preview.total_debit')}
          value={formatUsd(preview.totalDebit)}
          testID={PredictOrderFlowTestIds.TOTAL_DEBIT}
        />
      ) : null}
    </>
  );
};

/** Server-quoted sell Preview rows: the Cash Out mirror of the buy rows,
 * with Net Proceeds — the sell counterpart of Total Debit — emphasized. */
const SellPreviewRows = ({
  preview,
  withTotal = true,
}: {
  preview: PredictOrderPreview;
  withTotal?: boolean;
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
      {withTotal ? (
        <EmphasizedTotalRow
          label={strings('predict_next.order_preview.net_proceeds')}
          value={formatUsd(preview.estimatedNetProceeds)}
          testID={PredictOrderFlowTestIds.NET_PROCEEDS}
        />
      ) : null}
    </>
  );
};

/** Server-quoted preview rows: distinct canonical values, verbatim, for the
 * quoted Order Action. When the profile's invariant produced a signed bound
 * (`display`), the emphasized Total shows that bound — the worst case the
 * phone actually signs — and profit is measured against it. */
export const OrderPreviewRows = ({
  preview,
  display,
}: {
  preview: PredictOrderPreview;
  display?: InvariantDisplay;
}) => {
  if (preview.action === 'buy') {
    return (
      <Box twClassName="gap-2" testID={PredictOrderFlowTestIds.QUOTE}>
        <BuyPreviewRows preview={preview} withTotal={display === undefined} />
        {display ? <BuySignedTail display={display} /> : null}
      </Box>
    );
  }
  return (
    <Box twClassName="gap-2" testID={PredictOrderFlowTestIds.QUOTE}>
      <SellPreviewRows preview={preview} withTotal={display === undefined} />
      {display ? <SellSignedTail display={display} /> : null}
    </Box>
  );
};

/** The signed buy tail: the invariant's worst-case cost the phone signs,
 * replacing the quoted Total; profit is measured against it. */
const BuySignedTail = ({
  display,
}: {
  display: InvariantDisplay;
}) => {
  const profit = (
    Number(display.payout) - Number(display.maxCost)
  ).toFixed(2);
  return (
    <>
      <EmphasizedTotalRow
        label={strings('predict_next.order_preview.max_cost')}
        value={formatUsd(display.maxCost)}
        testID={PredictOrderFlowTestIds.TOTAL_DEBIT}
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
    </>
  );
};

/** The signed sell tail: the invariant's worst-case proceeds the phone
 * signs, replacing the quoted Net Proceeds. */
const SellSignedTail = ({ display }: { display: InvariantDisplay }) => (
  <EmphasizedTotalRow
    label={strings('predict_next.order_preview.min_proceeds')}
    value={formatUsd(display.minProceeds)}
    testID={PredictOrderFlowTestIds.NET_PROCEEDS}
  />
);

import React from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import type { PredictOrderReceipt } from '../../../types';
import { formatCents } from '../../../utils/formatCents';
import { formatUsd } from '../../../utils/formatUsd';

import { OrderDataRow } from './OrderDataRow';
import { PredictOrderFlowTestIds } from './PredictOrderFlow.testIds';

/** Canonical decimal amounts like '43.00' display as bare contract counts:
 * '43.00' → '43', '12.50' → '12.5'. */
const formatContracts = (amount: string): string => String(Number(amount));

interface StatusIconProps {
  iconName: IconName;
  color: IconColor;
  background: string;
}

/** The legacy Order outcome treatment: a tinted circle behind one icon. */
const StatusIcon = ({ iconName, color, background }: StatusIconProps) => (
  <Box
    twClassName={`h-12 w-12 items-center justify-center rounded-full ${background}`}
  >
    <Icon name={iconName} size={IconSize.Xl} color={color} />
  </Box>
);

/** The execution values the Venue reported, rendered only when reported. */
const FillRows = ({ receipt }: { receipt: PredictOrderReceipt }) => (
  <Box twClassName="gap-2">
    {receipt.filledContracts !== null && (
      <OrderDataRow
        label={strings('predict_next.order_receipt.filled_contracts')}
        value={formatContracts(receipt.filledContracts)}
        testID={PredictOrderFlowTestIds.FILLED_CONTRACTS}
      />
    )}
    {receipt.averageFillPrice !== null && (
      <OrderDataRow
        label={strings('predict_next.order_receipt.average_fill_price')}
        value={formatCents(receipt.averageFillPrice)}
        testID={PredictOrderFlowTestIds.AVERAGE_FILL_PRICE}
      />
    )}
    {receipt.actualSpend !== null && (
      <OrderDataRow
        label={strings('predict_next.order_receipt.actual_spend')}
        value={formatUsd(receipt.actualSpend)}
        testID={PredictOrderFlowTestIds.ACTUAL_SPEND}
        bold
      />
    )}
    {receipt.fee !== null && (
      <OrderDataRow
        label={strings('predict_next.order_preview.fee')}
        value={formatUsd(receipt.fee)}
        testID={PredictOrderFlowTestIds.FEE}
      />
    )}
    {receipt.payoutExposure !== null && (
      <OrderDataRow
        label={strings('predict_next.order_receipt.payout_exposure')}
        value={formatUsd(receipt.payoutExposure)}
        valueColor={TextColor.SuccessDefault}
        testID={PredictOrderFlowTestIds.PAYOUT_EXPOSURE}
      />
    )}
  </Box>
);

interface OrderReceiptOutcomeProps {
  receipt: PredictOrderReceipt;
  /** The Outcome label the committed Order bought, for position context. */
  outcomeLabel: string;
  /** The quoted average price the Order tried to buy at, for the
   * not-filled copy. */
  quotedPrice: string;
  isRechecking: boolean;
  onKeepChecking: () => void;
  onRequote: () => void;
  onDone: () => void;
}

/**
 * The receipt-driven Order outcomes. One Order produces exactly one Order
 * Receipt; every status renders honestly:
 *
 * - `filled` and `partially_filled` are successes; the partial copy always
 * states the filled quantity and the canceled remainder.
 * - `not_filled` reuses the legacy Order-not-filled treatment (market busy,
 * nothing spent) with a re-quote affordance.
 * - `rejected` states that the venue refused the Order and the balance is
 * untouched, with a re-quote affordance.
 * - `pending`, `submitted`, and `reconciliation_required` mean the backend
 * is still resolving the true outcome; the keep-checking affordance
 * re-POSTs the idempotent Commit to observe it.
 */
export const OrderReceiptOutcome = ({
  receipt,
  outcomeLabel,
  quotedPrice,
  isRechecking,
  onKeepChecking,
  onRequote,
  onDone,
}: OrderReceiptOutcomeProps): React.JSX.Element => {
  switch (receipt.status) {
    case 'filled':
    case 'partially_filled': {
      const isPartial = receipt.status === 'partially_filled';
      const filled = Number(receipt.filledContracts ?? '0');
      const remainder = Math.max(receipt.quotedContracts - filled, 0);
      return (
        <Box
          twClassName="items-center gap-3 py-6"
          testID={
            isPartial
              ? PredictOrderFlowTestIds.RECEIPT_PARTIALLY_FILLED
              : PredictOrderFlowTestIds.RECEIPT_FILLED
          }
        >
          <StatusIcon
            iconName={IconName.Check}
            color={IconColor.SuccessDefault}
            background="bg-success-muted"
          />
          <Text variant={TextVariant.HeadingSm}>
            {strings(
              isPartial
                ? 'predict_next.order_receipt.partial_title'
                : 'predict_next.order_receipt.filled_title',
            )}
          </Text>
          {isPartial && (
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              twClassName="text-center"
              testID={PredictOrderFlowTestIds.REMAINDER}
            >
              {strings('predict_next.order_receipt.partial_description', {
                filled: formatContracts(receipt.filledContracts ?? '0'),
                quoted: receipt.quotedContracts,
                remainder,
              })}
            </Text>
          )}
          <Text
            variant={TextVariant.BodyMd}
            testID={PredictOrderFlowTestIds.POSITION_CONTEXT}
          >
            {strings('predict_next.order_receipt.position_context', {
              contracts: formatContracts(receipt.filledContracts ?? '0'),
              outcome: outcomeLabel,
            })}
          </Text>
          <Box twClassName="w-full gap-2">
            <FillRows receipt={receipt} />
          </Box>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={onDone}
            testID={PredictOrderFlowTestIds.DONE}
          >
            {strings('predict_next.order_preview.done')}
          </Button>
        </Box>
      );
    }
    case 'not_filled':
      return (
        <Box
          twClassName="items-center gap-3 py-6"
          testID={PredictOrderFlowTestIds.RECEIPT_NOT_FILLED}
        >
          <StatusIcon
            iconName={IconName.Warning}
            color={IconColor.WarningDefault}
            background="bg-warning-muted"
          />
          <Text variant={TextVariant.HeadingSm}>
            {strings('predict_next.order_receipt.not_filled_title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings('predict_next.order_receipt.not_filled_description', {
              price: quotedPrice,
            })}
          </Text>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={onRequote}
            testID={PredictOrderFlowTestIds.REQUOTE}
          >
            {strings('predict_next.order_receipt.requote')}
          </Button>
        </Box>
      );
    case 'rejected':
      return (
        <Box
          twClassName="items-center gap-3 py-6"
          testID={PredictOrderFlowTestIds.RECEIPT_REJECTED}
        >
          <StatusIcon
            iconName={IconName.Warning}
            color={IconColor.ErrorDefault}
            background="bg-error-muted"
          />
          <Text variant={TextVariant.HeadingSm}>
            {strings('predict_next.order_receipt.rejected_title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings('predict_next.order_receipt.rejected_description')}
          </Text>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={onRequote}
            testID={PredictOrderFlowTestIds.REQUOTE}
          >
            {strings('predict_next.order_receipt.requote')}
          </Button>
        </Box>
      );
    case 'pending':
    case 'submitted':
    case 'reconciliation_required':
      return (
        <Box
          twClassName="items-center gap-3 py-6"
          testID={PredictOrderFlowTestIds.RECEIPT_RECONCILING}
        >
          <StatusIcon
            iconName={IconName.ClockFilled}
            color={IconColor.InfoDefault}
            background="bg-info-muted"
          />
          <Text variant={TextVariant.HeadingSm}>
            {strings('predict_next.order_receipt.reconciling_title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings('predict_next.order_receipt.reconciling_description')}
          </Text>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isLoading={isRechecking}
            onPress={onKeepChecking}
            testID={PredictOrderFlowTestIds.KEEP_CHECKING}
          >
            {strings('predict_next.order_receipt.keep_checking')}
          </Button>
        </Box>
      );
  }
};

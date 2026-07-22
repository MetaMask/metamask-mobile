import React, { useMemo } from 'react';
import {
  Box,
  KeyValueRow,
  KeyValueRowVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { BigNumber } from 'bignumber.js';
import { TransactionType } from '@metamask/transaction-controller';
import {
  useIsTransactionPayLoading,
  useTransactionPayTotals,
} from '../../../hooks/pay/useTransactionPayData';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { ConfirmationRowComponentIDs } from '../../../ConfirmationView.testIds';
import { useConfirmationContext } from '../../../context/confirmation-context';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { hasTransactionType } from '../../../utils/transaction';
import { KeyValueRowSkeleton } from '../key-value-row-skeleton';

const HIDE_TYPES = [TransactionType.musdConversion];

/**
 * Row component that displays the total cost for deposit/payment transactions.
 * For withdrawal transactions, use ReceiveRow instead.
 */
export function TotalRow() {
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const isLoading = useIsTransactionPayLoading();
  const totals = useTransactionPayTotals();
  const { isHeadlessBuyInProgress } = useConfirmationContext();
  const transactionMetadata = useTransactionMetadataRequest();

  const totalUsd = useMemo(() => {
    if (!totals?.total) return '';
    return formatFiat(new BigNumber(totals.total.usd));
  }, [totals, formatFiat]);

  if (hasTransactionType(transactionMetadata, HIDE_TYPES)) {
    return null;
  }

  if (isLoading) {
    return <KeyValueRowSkeleton testID="total-row-skeleton" />;
  }

  const textColor = isHeadlessBuyInProgress
    ? TextColor.TextMuted
    : TextColor.TextAlternative;

  return (
    <Box testID="total-row">
      <KeyValueRow
        variant={KeyValueRowVariant.Summary}
        keyLabel={strings('confirm.label.total')}
        value={
          <Text
            variant={TextVariant.BodyMd}
            color={textColor}
            testID={ConfirmationRowComponentIDs.TOTAL}
          >
            {totalUsd}
          </Text>
        }
      />
    </Box>
  );
}

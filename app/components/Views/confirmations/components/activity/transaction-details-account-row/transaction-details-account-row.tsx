import React from 'react';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import { strings } from '../../../../../../../locales/i18n';
import { NameType } from '../../../../../UI/Name/Name.types';
import { useAccountNames } from '../../../../../hooks/DisplayName/useAccountNames';
import Text, {
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { TransactionType } from '@metamask/transaction-controller';
import { hasTransactionType } from '../../../utils/transaction';

const TRANSACTION_TYPES = [
  TransactionType.predictClaim,
  TransactionType.predictWithdraw,
];

export function TransactionDetailsAccountRow() {
  const { transactionMeta } = useTransactionDetails();

  const {
    chainId,
    txParams: { from },
  } = transactionMeta;

  const accountName = useAccountNames([
    {
      value: from,
      variation: chainId,
      type: NameType.EthereumAddress,
    },
  ])?.[0];

  if (!hasTransactionType(transactionMeta, TRANSACTION_TYPES)) {
    return null;
  }

  return (
    <TransactionDetailsRow label={strings('transaction_details.label.account')}>
      <Text color={TextColor.Alternative}>{accountName ?? from}</Text>
    </TransactionDetailsRow>
  );
}

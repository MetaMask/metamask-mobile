import React, { useMemo } from 'react';
import { type Hex } from '@metamask/utils';
import { TransactionType } from '@metamask/transaction-controller';
import Text from '../../../../../component-library/components/Texts/Text';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import AvatarAccount from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { Box } from '../../../Box/Box';
import { AlignItems, FlexDirection } from '../../../Box/box.types';
import Name from '../../../Name/Name';
import { NameType } from '../../../Name/Name.types';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionDetails } from '../../../../Views/confirmations/hooks/activity/useTransactionDetails';
import { hasTransactionType, parseStandardTokenTransactionData } from '../../../../Views/confirmations/utils/transaction';
import { TransactionDetailsRow } from '../../../../Views/confirmations/components/activity/transaction-details-row/transaction-details-row';
import { getTokenTransferData } from '../../../../Views/confirmations/utils/transaction-pay';

const SEND_TYPES: TransactionType[] = [
  TransactionType.moneyAccountWithdraw,
  TransactionType.perpsDeposit,
  TransactionType.predictDeposit,
];

function useRecipient(): Hex | undefined {
  const { transactionMeta } = useTransactionDetails();
  return useMemo(() => {
    const { data } = getTokenTransferData(transactionMeta) ?? {};
    if (!data) {
      return undefined;
    }
    const parsed = parseStandardTokenTransactionData(data);
    return parsed?.args?._to?.toString() as Hex | undefined;
  }, [transactionMeta]);
}

function getToLabel(transactionMeta: {
  type?: string;
  nestedTransactions?: { type?: string }[];
}): string | undefined {
  if (
    hasTransactionType(
      transactionMeta as Parameters<typeof hasTransactionType>[0],
      [TransactionType.perpsDeposit],
    )
  ) {
    return strings('transaction_details.label.perps_account');
  }
  if (
    hasTransactionType(
      transactionMeta as Parameters<typeof hasTransactionType>[0],
      [TransactionType.predictDeposit],
    )
  ) {
    return strings('transaction_details.label.predictions_account');
  }
  return undefined;
}

export function MoneyTransactionDetailsToRow() {
  const { transactionMeta } = useTransactionDetails();
  const recipient = useRecipient();
  const chainId = transactionMeta?.chainId as Hex;

  const isSendType = hasTransactionType(transactionMeta, SEND_TYPES);

  if (!isSendType) {
    return null;
  }

  const staticLabel = getToLabel(transactionMeta);

  return (
    <TransactionDetailsRow label={strings('transaction_details.label.to')}>
      {staticLabel ? (
        <Box
          flexDirection={FlexDirection.Row}
          alignItems={AlignItems.center}
          gap={6}
        >
          <AvatarAccount
            accountAddress={recipient ?? '0x0'}
            size={AvatarSize.Sm}
          />
          <Text>{staticLabel}</Text>
        </Box>
      ) : recipient ? (
        <Name
          type={NameType.EthereumAddress}
          value={recipient}
          variation={chainId}
        />
      ) : null}
    </TransactionDetailsRow>
  );
}

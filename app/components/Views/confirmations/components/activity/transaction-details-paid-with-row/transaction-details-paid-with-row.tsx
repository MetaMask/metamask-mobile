import React from 'react';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import Text from '../../../../../../component-library/components/Texts/Text';
import { Box } from '../../../../../UI/Box/Box';
import { AlignItems, FlexDirection } from '../../../../../UI/Box/box.types';
import { TokenIcon, TokenIconVariant } from '../../token-icon';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { useIsMoneyAccountContext } from '../../../hooks/activity/useIsMoneyAccountContext';
import { strings } from '../../../../../../../locales/i18n';
import { useTokenWithBalance } from '../../../hooks/tokens/useTokenWithBalance';
import { TransactionDetailsSelectorIDs } from '../TransactionDetailsModal.testIds';
import { TransactionType } from '@metamask/transaction-controller';
import { hasTransactionType } from '../../../utils/transaction';

const MONEY_HERO_TYPES = [
  TransactionType.moneyAccountDeposit,
  TransactionType.musdConversion,
  TransactionType.perpsDeposit,
  TransactionType.perpsWithdraw,
  TransactionType.predictDeposit,
  TransactionType.predictWithdraw,
];

export function TransactionDetailsPaidWithRow() {
  const { transactionMeta } = useTransactionDetails();
  const isMoneyContext = useIsMoneyAccountContext();
  const { metamaskPay } = transactionMeta;
  const { chainId, tokenAddress, isPostQuote } = metamaskPay || {};
  const token = useTokenWithBalance(tokenAddress ?? '0x0', chainId ?? '0x0');

  if (!chainId || !tokenAddress || !token) {
    return null;
  }

  if (isMoneyContext && hasTransactionType(transactionMeta, MONEY_HERO_TYPES)) {
    return null;
  }

  // For post-quote withdrawals, metamaskPay token is the destination (received),
  // not the source (paid with).
  const label = isPostQuote
    ? strings('transaction_details.label.receive_token')
    : strings('transaction_details.label.paid_with');

  return (
    <TransactionDetailsRow label={label}>
      <Box
        flexDirection={FlexDirection.Row}
        gap={6}
        alignItems={AlignItems.center}
      >
        <TokenIcon
          chainId={chainId}
          address={tokenAddress}
          variant={TokenIconVariant.Row}
        />
        <Text testID={TransactionDetailsSelectorIDs.PAID_WITH_SYMBOL}>
          {token.symbol}
        </Text>
      </Box>
    </TransactionDetailsRow>
  );
}

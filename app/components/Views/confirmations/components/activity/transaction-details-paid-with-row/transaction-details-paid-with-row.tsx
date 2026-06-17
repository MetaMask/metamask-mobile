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
import { useFiatOrderStatus } from '../../../hooks/activity/useFiatOrderStatus';
import PaymentMethodIcon from '../../../../../UI/Ramp/Aggregator/components/PaymentMethodIcon';
import { PaymentType } from '@consensys/on-ramp-sdk';
import { useTheme } from '../../../../../../util/theme';

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
  const { chainId, tokenAddress, isPostQuote, fiat } = metamaskPay || {};
  const token = useTokenWithBalance(tokenAddress ?? '0x0', chainId ?? '0x0');
  const { colors } = useTheme();

  const isFiatDeposit =
    isMoneyContext &&
    hasTransactionType(transactionMeta, [
      TransactionType.moneyAccountDeposit,
    ]) &&
    Boolean(fiat?.orderId);

  const { paymentMethodName } = useFiatOrderStatus(
    fiat?.orderId,
    fiat?.provider,
    transactionMeta.txParams?.from as string | undefined,
    transactionMeta.status,
  );

  if (isFiatDeposit) {
    if (!paymentMethodName) {
      return null;
    }

    return (
      <TransactionDetailsRow
        label={strings('transaction_details.label.paid_with')}
      >
        <Box
          flexDirection={FlexDirection.Row}
          gap={6}
          alignItems={AlignItems.center}
        >
          <PaymentMethodIcon
            paymentMethodType={
              paymentMethodName.toLowerCase().includes('apple')
                ? PaymentType.ApplePay
                : PaymentType.DebitCreditCard
            }
            size={16}
            color={colors.text.default}
          />
          <Text testID={TransactionDetailsSelectorIDs.PAID_WITH_SYMBOL}>
            {paymentMethodName}
          </Text>
        </Box>
      </TransactionDetailsRow>
    );
  }

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

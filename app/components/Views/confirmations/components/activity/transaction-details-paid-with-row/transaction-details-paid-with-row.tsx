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
import { getMusdDisplaySymbol } from '../../../../../UI/Earn/constants/musd';
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
    isFiatDeposit ? fiat?.orderId : undefined,
    isFiatDeposit ? fiat?.provider : undefined,
    isFiatDeposit
      ? (transactionMeta.txParams?.from as string | undefined)
      : undefined,
    transactionMeta.status,
  );

  if (isFiatDeposit && !paymentMethodName) {
    return null;
  }

  if (!isFiatDeposit) {
    if (!chainId || !tokenAddress || !token) {
      return null;
    }
    if (
      isMoneyContext &&
      hasTransactionType(transactionMeta, MONEY_HERO_TYPES)
    ) {
      return null;
    }
  }

  // For post-quote withdrawals, metamaskPay token is the destination (received),
  // not the source (paid with).
  const label =
    !isFiatDeposit && isPostQuote
      ? strings('transaction_details.label.receive_token')
      : strings('transaction_details.label.paid_with');

  const icon = isFiatDeposit ? (
    <PaymentMethodIcon
      paymentMethodType={inferPaymentType(paymentMethodName ?? '')}
      size={16}
      color={colors.text.default}
    />
  ) : (
    <TokenIcon
      chainId={chainId ?? '0x0'}
      address={tokenAddress ?? '0x0'}
      variant={TokenIconVariant.Row}
    />
  );

  const displayText = isFiatDeposit
    ? (paymentMethodName ?? '')
    : (getMusdDisplaySymbol(tokenAddress, token?.symbol) ?? '');

  return (
    <TransactionDetailsRow label={label}>
      <Box
        flexDirection={FlexDirection.Row}
        gap={6}
        alignItems={AlignItems.center}
      >
        {icon}
        <Text testID={TransactionDetailsSelectorIDs.PAID_WITH_SYMBOL}>
          {displayText}
        </Text>
      </Box>
    </TransactionDetailsRow>
  );
}

/**
 * Maps the Ramps order `paymentMethod.name` to a {@link PaymentType} for the
 * icon. The Ramps API returns a display name but no enum — this heuristic
 * covers the known values ("Apple Pay", "Google Pay", "Debit Card", etc.).
 */
function inferPaymentType(name: string): PaymentType {
  const lower = name.toLowerCase();
  if (lower.includes('apple')) return PaymentType.ApplePay;
  if (lower.includes('google')) return PaymentType.GooglePay;
  if (lower.includes('bank')) return PaymentType.BankTransfer;
  return PaymentType.DebitCreditCard;
}

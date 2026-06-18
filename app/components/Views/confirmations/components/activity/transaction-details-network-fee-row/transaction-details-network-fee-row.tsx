import React, { useMemo } from 'react';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import { Box } from '../../../../../UI/Box/Box';
import { AlignItems, FlexDirection } from '../../../../../UI/Box/box.types';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { useIsMoneyAccountContext } from '../../../hooks/activity/useIsMoneyAccountContext';
import { strings } from '../../../../../../../locales/i18n';
import { TransactionType } from '@metamask/transaction-controller';
import { hasTransactionType } from '../../../utils/transaction';
import { useFeeCalculations } from '../../../hooks/gas/useFeeCalculations';
import { BigNumber } from 'bignumber.js';
import { TransactionDetailsSelectorIDs } from '../TransactionDetailsModal.testIds';
import { usePayFiatFormatter } from '../../../hooks/pay/usePayFiatFormatter';

const FALLBACK_TYPES = [
  TransactionType.moneyAccountWithdraw,
  TransactionType.perpsWithdraw,
  TransactionType.predictClaim,
  TransactionType.predictWithdraw,
  TransactionType.musdClaim,
  TransactionType.revokeDelegation,
];

const SPONSORED_FEE_TYPES = [
  TransactionType.musdConversion,
  TransactionType.moneyAccountDeposit,
];

export function TransactionDetailsNetworkFeeRow() {
  const formatFiat = usePayFiatFormatter();
  const { transactionMeta } = useTransactionDetails();
  const isMoneyContext = useIsMoneyAccountContext();
  const { estimatedFeeFiatPrecise } = useFeeCalculations(transactionMeta);

  const { metamaskPay } = transactionMeta;
  const { networkFeeFiat: payNetworkFeeFiat } = metamaskPay || {};

  const networkFee = payNetworkFeeFiat ?? estimatedFeeFiatPrecise;

  const networkFeeFormatted = useMemo(
    () => formatFiat(new BigNumber(networkFee ?? 0)),
    [formatFiat, networkFee],
  );

  if (
    !payNetworkFeeFiat &&
    !hasTransactionType(transactionMeta, FALLBACK_TYPES)
  ) {
    return null;
  }

  const isSponsored =
    isMoneyContext &&
    hasTransactionType(transactionMeta, SPONSORED_FEE_TYPES) &&
    payNetworkFeeFiat !== undefined &&
    new BigNumber(payNetworkFeeFiat).isZero();

  return (
    <TransactionDetailsRow
      label={strings('transaction_details.label.network_fee')}
    >
      {isSponsored ? (
        <SponsoredIndicator />
      ) : (
        <Text testID={TransactionDetailsSelectorIDs.NETWORK_FEE}>
          {networkFeeFormatted}
        </Text>
      )}
    </TransactionDetailsRow>
  );
}

function SponsoredIndicator() {
  return (
    <Box
      flexDirection={FlexDirection.Row}
      alignItems={AlignItems.center}
      gap={4}
      testID="paid-by-metamask"
    >
      <Icon
        name={IconName.Check}
        color={IconColor.Success}
        size={IconSize.Sm}
      />
      <Text variant={TextVariant.BodyMD} color={TextColor.Success}>
        {strings('transactions.paid_by_metamask')}
      </Text>
    </Box>
  );
}

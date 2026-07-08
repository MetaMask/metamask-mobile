import React from 'react';
import { TransactionType } from '@metamask/transaction-controller';
import { BigNumber } from 'bignumber.js';
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
import { hasTransactionType } from '../../../utils/transaction';
import { strings } from '../../../../../../../locales/i18n';
import { TransactionDetailsNetworkFeeRow } from '../transaction-details-network-fee-row';
import { TransactionDetailsBridgeFeeRow } from '../transaction-details-bridge-fee-row';

const SPONSORED_FEE_TYPES = [
  TransactionType.musdConversion,
  TransactionType.moneyAccountDeposit,
];

export function TransactionDetailsFeeSection() {
  const { transactionMeta } = useTransactionDetails();
  const isMoneyContext = useIsMoneyAccountContext();

  const { metamaskPay } = transactionMeta;
  const { networkFeeFiat: payNetworkFeeFiat, bridgeFeeFiat: payBridgeFeeFiat } =
    metamaskPay || {};

  const isSponsored =
    isMoneyContext &&
    hasTransactionType(transactionMeta, SPONSORED_FEE_TYPES) &&
    payNetworkFeeFiat !== undefined &&
    new BigNumber(payNetworkFeeFiat).isZero() &&
    new BigNumber(payBridgeFeeFiat ?? 0).isZero();

  if (isSponsored) {
    return (
      <TransactionDetailsRow
        label={strings('transaction_details.label.transaction_fees')}
      >
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
      </TransactionDetailsRow>
    );
  }

  return (
    <>
      <TransactionDetailsNetworkFeeRow />
      <TransactionDetailsBridgeFeeRow />
    </>
  );
}

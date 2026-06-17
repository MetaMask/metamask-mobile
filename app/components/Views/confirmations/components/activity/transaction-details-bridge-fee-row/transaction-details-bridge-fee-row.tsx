import React, { useMemo } from 'react';
import { TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import Text from '../../../../../../component-library/components/Texts/Text';
import { Box } from '../../../../../UI/Box/Box';
import { AlignItems, FlexDirection } from '../../../../../UI/Box/box.types';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { useIsMoneyAccountContext } from '../../../hooks/activity/useIsMoneyAccountContext';
import { hasTransactionType } from '../../../utils/transaction';
import { strings } from '../../../../../../../locales/i18n';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { BigNumber } from 'bignumber.js';
import { TransactionDetailsSelectorIDs } from '../TransactionDetailsModal.testIds';
import { TokenIcon, TokenIconVariant } from '../../token-icon';

export function TransactionDetailsBridgeFeeRow() {
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const { transactionMeta } = useTransactionDetails();
  const isMoneyContext = useIsMoneyAccountContext();
  const { metamaskPay } = transactionMeta;
  const {
    bridgeFeeFiat,
    tokenAddress,
    chainId: sourceChainId,
  } = metamaskPay || {};

  const isWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountWithdraw,
    TransactionType.perpsWithdraw,
    TransactionType.predictWithdraw,
  ]);

  const label = isWithdraw
    ? strings('transaction_details.label.provider_fee')
    : strings('transaction_details.label.bridge_fee');

  const bridgeFeeFiatFormatted = useMemo(
    () => formatFiat(new BigNumber(bridgeFeeFiat ?? 0)),
    [bridgeFeeFiat, formatFiat],
  );

  if (!bridgeFeeFiat) {
    return null;
  }

  const showFeeIcon = isMoneyContext && tokenAddress && sourceChainId;

  return (
    <TransactionDetailsRow label={label}>
      {showFeeIcon ? (
        <Box
          flexDirection={FlexDirection.Row}
          alignItems={AlignItems.center}
          gap={4}
        >
          <Text testID={TransactionDetailsSelectorIDs.TRANSACTION_FEE}>
            {bridgeFeeFiatFormatted}
          </Text>
          <TokenIcon
            chainId={sourceChainId as Hex}
            address={tokenAddress as Hex}
            variant={TokenIconVariant.Row}
          />
        </Box>
      ) : (
        <Text testID={TransactionDetailsSelectorIDs.TRANSACTION_FEE}>
          {bridgeFeeFiatFormatted}
        </Text>
      )}
    </TransactionDetailsRow>
  );
}

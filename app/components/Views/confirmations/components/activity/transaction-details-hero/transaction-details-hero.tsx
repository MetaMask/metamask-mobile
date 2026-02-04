import React from 'react';
import { Box } from '../../../../../UI/Box/Box';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { AlignItems } from '../../../../../UI/Box/box.types';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { TransactionType } from '@metamask/transaction-controller';
import {
  hasTransactionType,
  parseStandardTokenTransactionData,
} from '../../../utils/transaction';
import { Result } from '@ethersproject/abi';
import { calcTokenAmount } from '../../../../../../util/transactions';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './transaction-details-hero.styles';
import { getTokenTransferData } from '../../../utils/transaction-pay';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { PERPS_CURRENCY } from '../../../constants/perps';
import { useTokenWithBalance } from '../../../hooks/tokens/useTokenWithBalance';
import { BigNumber } from 'bignumber.js';

const SUPPORTED_TYPES = [
  TransactionType.musdConversion,
  TransactionType.perpsDeposit,
  TransactionType.predictDeposit,
  TransactionType.predictWithdraw,
];

export function TransactionDetailsHero() {
  const formatFiat = useFiatFormatter({ currency: PERPS_CURRENCY });
  const { styles } = useStyles(styleSheet, {});
  const decodedAmount = useDecodedAmount();
  const targetFiat = useTargetFiat();
  const { transactionMeta } = useTransactionDetails();

  if (!hasTransactionType(transactionMeta, SUPPORTED_TYPES)) {
    return null;
  }

  const amount = targetFiat ?? decodedAmount;

  if (!amount) {
    return null;
  }

  const formattedAmount = formatFiat(amount);

  return (
    <Box
      testID="transaction-details-hero"
      alignItems={AlignItems.center}
      gap={12}
      style={styles.container}
    >
      <Text variant={TextVariant.DisplayLG}>{formattedAmount}</Text>
    </Box>
  );
}

function useTargetFiat() {
  const { transactionMeta } = useTransactionDetails();
  const { metamaskPay } = transactionMeta;
  const { targetFiat } = metamaskPay ?? {};

  if (!targetFiat || targetFiat === '0') {
    return null;
  }

  return new BigNumber(targetFiat);
}

function useDecodedAmount() {
  const { transactionMeta } = useTransactionDetails();
  const { chainId } = transactionMeta;
  const { data, to } = getTokenTransferData(transactionMeta) ?? {};
  const token = useTokenWithBalance(to ?? '0x0', chainId);

  if (!to || !data) {
    return null;
  }

  const decodedData = parseStandardTokenTransactionData(data);

  const { decimals } = token ?? {};
  const { _value: amount } = decodedData?.args ?? ({} as Result);

  if (!amount || !decimals) {
    return null;
  }

  return calcTokenAmount(amount, decimals);
}

import React, { useMemo } from 'react';
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
import { useTokensWithBalance } from '../../../../../UI/Bridge/hooks/useTokensWithBalance';
import { Result } from '@ethersproject/abi';
import { calcTokenAmount } from '../../../../../../util/transactions';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './transaction-details-hero.styles';
import { getTokenTransferData } from '../../../utils/transaction-pay';

const SUPPORTED_TYPES = [
  TransactionType.perpsDeposit,
  TransactionType.predictDeposit,
];

export function TransactionDetailsHero() {
  const { styles } = useStyles(styleSheet, {});
  const { transactionMeta } = useTransactionDetails();
  const { chainId } = transactionMeta;
  const chainIds = useMemo(() => (chainId ? [chainId] : []), [chainId]);
  const tokens = useTokensWithBalance({ chainIds });

  if (!hasTransactionType(transactionMeta, SUPPORTED_TYPES)) {
    return null;
  }

  const { data, to } = getTokenTransferData(transactionMeta) ?? {};

  if (!to || !data) {
    return null;
  }

  const decodedData = parseStandardTokenTransactionData(data);

  const token = tokens.find(
    (t) => t.address.toLowerCase() === to.toLowerCase(),
  );

  const { decimals } = token ?? {};
  const { _value: amount } = decodedData?.args ?? ({} as Result);

  if (!amount || !decimals) {
    return null;
  }

  const amountHuman = calcTokenAmount(amount, decimals).toString(10);

  return (
    <Box
      testID="transaction-details-hero"
      alignItems={AlignItems.center}
      gap={12}
      style={styles.container}
    >
      <Text variant={TextVariant.DisplayLG}>${amountHuman}</Text>
    </Box>
  );
}

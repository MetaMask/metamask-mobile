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

const SUPPORTED_TYPES = [
  TransactionType.perpsDeposit,
  TransactionType.predictDeposit,
  TransactionType.predictWithdraw,
];

export function TransactionDetailsHero() {
  const formatFiat = useFiatFormatter({ currency: PERPS_CURRENCY });
  const { styles } = useStyles(styleSheet, {});
  const { transactionMeta } = useTransactionDetails();
  const { chainId } = transactionMeta;
  const { data, to } = getTokenTransferData(transactionMeta) ?? {};
  const token = useTokenWithBalance(to ?? '0x0', chainId);

  if (!hasTransactionType(transactionMeta, SUPPORTED_TYPES)) {
    return null;
  }

  if (!to || !data) {
    return null;
  }

  const decodedData = parseStandardTokenTransactionData(data);

  const { decimals } = token ?? {};
  const { _value: amount } = decodedData?.args ?? ({} as Result);

  if (!amount || !decimals) {
    return null;
  }

  const formattedAmount = formatFiat(calcTokenAmount(amount, decimals));

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

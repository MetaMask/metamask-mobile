import React, { useMemo } from 'react';
import { Box } from '../../../../../UI/Box/Box';
import { TokenIcon, TokenIconVariant } from '../../token-icon';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { AlignItems } from '../../../../../UI/Box/box.types';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { TransactionType } from '@metamask/transaction-controller';
import { parseStandardTokenTransactionData } from '../../../utils/transaction';
import { Hex } from '@metamask/utils';
import { useTokensWithBalance } from '../../../../../UI/Bridge/hooks/useTokensWithBalance';
import { Result } from '@ethersproject/abi';
import { calcTokenAmount } from '../../../../../../util/transactions';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './transaction-details-hero.styles';

export function TransactionDetailsHero() {
  const { styles } = useStyles(styleSheet, {});
  const { transactionMeta } = useTransactionDetails();
  const { chainId, txParams, type } = transactionMeta;
  const { data, to } = txParams;
  const chainIds = useMemo(() => (chainId ? [chainId] : []), [chainId]);
  const tokens = useTokensWithBalance({ chainIds });

  if (type !== TransactionType.perpsDeposit || !to || !data) {
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
    <Box alignItems={AlignItems.center} gap={12} style={styles.container}>
      <Box>
        <TokenIcon
          chainId={chainId}
          address={to as Hex}
          variant={TokenIconVariant.Hero}
          showNetwork={false}
        />
      </Box>
      <Text variant={TextVariant.HeadingLG}>${amountHuman}</Text>
    </Box>
  );
}

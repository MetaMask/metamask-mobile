import React from 'react';
import { View } from 'react-native';
import Text, {
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './pay-token-balance.styles';
import { useTokensWithBalance } from '../../../../UI/Bridge/hooks/useTokensWithBalance';
import { useTransactionPayToken } from '../../hooks/pay/useTransactionPayToken';
import { strings } from '../../../../../../locales/i18n';

export function PayTokenBalance() {
  const { styles } = useStyles(styleSheet, {});
  const { payToken } = useTransactionPayToken();
  const { address: payTokenAddress, chainId } = payToken;
  const tokens = useTokensWithBalance({ chainIds: [chainId] });

  const token = tokens.find(
    (t) =>
      t.address.toLowerCase() === payTokenAddress.toLowerCase() &&
      t.chainId === chainId,
  );

  if (!token) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text} color={TextColor.Alternative}>
        {strings('confirm.available_balance')}
        {token.balanceFiat}
      </Text>
    </View>
  );
}

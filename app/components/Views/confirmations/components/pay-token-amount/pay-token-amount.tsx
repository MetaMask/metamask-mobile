import React, { useMemo } from 'react';
import { View } from 'react-native';
import Text from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './pay-token-amount.styles';
import { useTransactionPayToken } from '../../hooks/pay/useTransactionPayToken';
import { BigNumber } from 'bignumber.js';
import { formatAmount } from '../../../../UI/SimulationDetails/formatAmount';
import I18n from '../../../../../../locales/i18n';
import { useTokenFiatRates } from '../../hooks/tokens/useTokenFiatRates';
import { Hex } from 'viem';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import { Skeleton } from '../../../../../component-library/components/Skeleton';

export interface PayTokenAmountProps {
  amountHuman: string;
}

export function PayTokenAmount({ amountHuman }: PayTokenAmountProps) {
  const { styles } = useStyles(styleSheet, {});
  const { chainId, txParams } = useTransactionMetadataRequest() ?? {};
  const { payToken } = useTransactionPayToken();
  const { to } = txParams ?? {};

  const fiatRequests = useMemo(
    () =>
      payToken && to
        ? [
            {
              chainId: payToken.chainId,
              address: payToken.address,
            },
            {
              chainId: chainId as Hex,
              address: to as Hex,
            },
          ]
        : [],
    [chainId, payToken, to],
  );

  const fiatRates = useTokenFiatRates(fiatRequests);

  const payTokenFiatRate = fiatRates[0];
  const assetFiatRate = fiatRates[1];

  if (!payTokenFiatRate || !assetFiatRate) return <PayTokenAmountSkeleton />;

  const assetToPayTokenRate = new BigNumber(assetFiatRate).dividedBy(
    payTokenFiatRate,
  );

  const payTokenAmount = new BigNumber(amountHuman || '0').multipliedBy(
    assetToPayTokenRate,
  );

  const formattedAmount = formatAmount(I18n.locale, payTokenAmount);

  return (
    <View testID="pay-token-amount" style={styles.container}>
      <Text>
        {formattedAmount} {payToken?.symbol}
      </Text>
    </View>
  );
}

export function PayTokenAmountSkeleton() {
  const { styles } = useStyles(styleSheet, {});
  return <Skeleton height={30} width={90} style={styles.skeleton} />;
}

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
import { getTokenAddress } from '../../utils/transaction-pay';

export interface PayTokenAmountProps {
  amountHuman: string;
}

export function PayTokenAmount({ amountHuman }: PayTokenAmountProps) {
  const { styles } = useStyles(styleSheet, {});
  const transaction = useTransactionMetadataRequest();
  const { chainId } = transaction ?? { chainId: '0x0' };
  const { payToken } = useTransactionPayToken();
  const targetTokenAddress = getTokenAddress(transaction);

  const fiatRequests = useMemo(
    () =>
      payToken && targetTokenAddress
        ? [
            {
              chainId: payToken.chainId,
              address: payToken.address,
            },
            {
              chainId: chainId as Hex,
              address: targetTokenAddress,
            },
          ]
        : [],
    [chainId, payToken, targetTokenAddress],
  );

  const fiatRates = useTokenFiatRates(fiatRequests);

  const payTokenFiatRate = fiatRates[0];
  const assetFiatRate = fiatRates[1];

  if (!payToken || !payTokenFiatRate || !assetFiatRate)
    return <PayTokenAmountSkeleton />;

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
  return (
    <View testID="pay-token-amount-skeleton">
      <Skeleton height={30} width={90} style={styles.skeleton} />
    </View>
  );
}

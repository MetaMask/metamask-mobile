import React, { useMemo } from 'react';
import { View } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useTransactionPayToken } from '../../hooks/pay/useTransactionPayToken';
import { BigNumber } from 'bignumber.js';
import { formatAmount } from '../../../../UI/SimulationDetails/formatAmount';
import I18n from '../../../../../../locales/i18n';
import { useTokenFiatRates } from '../../hooks/tokens/useTokenFiatRates';
import { Hex } from 'viem';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import { getTokenAddress } from '../../utils/transaction-pay';
import {
  useIsTransactionPayLoading,
  useTransactionPayIsMaxAmount,
} from '../../hooks/pay/useTransactionPayData';
import { isTransactionPayWithdraw } from '../../utils/transaction';

export interface PayTokenAmountProps {
  amountHuman: string;
  disabled?: boolean;
}

export function PayTokenAmount({ amountHuman, disabled }: PayTokenAmountProps) {
  const transaction = useTransactionMetadataRequest();
  const { chainId } = transaction ?? { chainId: '0x0' };
  const { payToken } = useTransactionPayToken();
  const targetTokenAddress = getTokenAddress(transaction);
  const isMaxAmount = useTransactionPayIsMaxAmount();
  const isQuotesLoading = useIsTransactionPayLoading();
  const isWithdrawal = isTransactionPayWithdraw(transaction);

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

  const formattedAmount = useMemo(() => {
    const payTokenFiatRate = fiatRates[0];
    const assetFiatRate = fiatRates[1];

    if (disabled || !payToken || !payTokenFiatRate || !assetFiatRate) {
      return undefined;
    }

    const assetToPayTokenRate = new BigNumber(assetFiatRate).dividedBy(
      payTokenFiatRate,
    );

    const payTokenAmount = new BigNumber(amountHuman || '0').multipliedBy(
      assetToPayTokenRate,
    );

    return formatAmount(I18n.locale, payTokenAmount);
  }, [amountHuman, disabled, payToken, fiatRates]);

  // Don't render for withdrawal transactions - they use PayWithRow for token selection
  if (isWithdrawal) {
    return null;
  }

  if (disabled) {
    return (
      <View testID="pay-token-amount">
        <Text color={TextColor.Muted}>0 ETH</Text>
      </View>
    );
  }

  if (!formattedAmount || (isMaxAmount && isQuotesLoading)) {
    return <PayTokenAmountSkeleton />;
  }

  return (
    <View testID="pay-token-amount">
      <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
        {formattedAmount} {payToken?.symbol}
      </Text>
    </View>
  );
}

export function PayTokenAmountSkeleton() {
  return (
    <View testID="pay-token-amount-skeleton">
      <Skeleton height={25} width={90} />
    </View>
  );
}

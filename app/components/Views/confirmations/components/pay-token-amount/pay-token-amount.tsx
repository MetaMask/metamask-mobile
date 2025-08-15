import React, { useMemo } from 'react';
import { useTokenAmount } from '../../hooks/useTokenAmount';
import { View } from 'react-native';
import Text from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './pay-token-amount.styles';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { useTransactionPayToken } from '../../hooks/pay/useTransactionPayToken';
import { useTokenAsset } from '../../hooks/useTokenAsset';
import { BigNumber } from 'bignumber.js';
import { formatAmount } from '../../../../UI/SimulationDetails/formatAmount';
import I18n from '../../../../../../locales/i18n';
import { useTokenFiatRates } from '../../hooks/tokens/useTokenFiatRates';
import { Hex } from 'viem';

export function PayTokenAmount() {
  const { styles } = useStyles(styleSheet, {});
  const { amountUnformatted } = useTokenAmount();
  const { asset } = useTokenAsset();
  const { payToken } = useTransactionPayToken();

  const fiatRequests = useMemo(
    () =>
      payToken && asset
        ? [
            {
              chainId: payToken.chainId,
              address: payToken.address,
            },
            {
              chainId: asset.chainId as Hex,
              address: asset.address as Hex,
            },
          ]
        : [],
    [asset, payToken],
  );

  const fiatRates = useTokenFiatRates(fiatRequests);

  const payTokenFiatRate = fiatRates[0];
  const assetFiatRate = fiatRates[1];

  if (!payTokenFiatRate || !assetFiatRate) return null;

  const assetToPayTokenRate = new BigNumber(assetFiatRate).dividedBy(
    payTokenFiatRate,
  );

  const payTokenAmount = new BigNumber(amountUnformatted || '0').multipliedBy(
    assetToPayTokenRate,
  );

  const formattedAmount = formatAmount(I18n.locale, payTokenAmount);

  return (
    <View testID="pay-token-amount" style={styles.container}>
      <Text>
        {formattedAmount} {payToken?.symbol}
      </Text>
      <Icon name={IconName.SwapVertical} size={IconSize.Md} />
    </View>
  );
}

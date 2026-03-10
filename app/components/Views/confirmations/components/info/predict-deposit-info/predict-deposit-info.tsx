import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import getHeaderCompactStandardNavbarOptions from '../../../../../../component-library/components-temp/HeaderCompactStandard/getHeaderCompactStandardNavbarOptions';
import { CustomAmountInfo } from '../custom-amount-info';
import { strings } from '../../../../../../../locales/i18n';
import { POLYGON_USDCE, PREDICT_CURRENCY } from '../../../constants/predict';
import { useAddToken } from '../../../hooks/tokens/useAddToken';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useConfirmActions } from '../../../hooks/useConfirmActions';
import { useFullScreenConfirmation } from '../../../hooks/ui/useFullScreenConfirmation';

export function PredictDepositInfo() {
  const navigation = useNavigation();
  const { onReject } = useConfirmActions();
  const { isFullScreenConfirmation } = useFullScreenConfirmation();

  useEffect(() => {
    if (isFullScreenConfirmation) {
      navigation.setOptions(
        getHeaderCompactStandardNavbarOptions({
          title: strings('confirm.title.predict_deposit'),
          onBack: onReject,
          includesTopInset: true,
          twClassName: 'bg-alternative',
        }),
      );
    }
  }, [isFullScreenConfirmation, navigation, onReject]);

  useAddToken({
    chainId: CHAIN_IDS.POLYGON,
    decimals: POLYGON_USDCE.decimals,
    name: POLYGON_USDCE.name,
    symbol: POLYGON_USDCE.symbol,
    tokenAddress: POLYGON_USDCE.address,
  });

  return <CustomAmountInfo currency={PREDICT_CURRENCY} />;
}

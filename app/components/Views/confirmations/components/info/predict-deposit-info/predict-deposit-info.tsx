import React from 'react';
import useNavbar from '../../../hooks/ui/useNavbar';
import { CustomAmountInfo } from '../custom-amount-info';
import { strings } from '../../../../../../../locales/i18n';
import { POLYGON_USDCE, PREDICT_CURRENCY } from '../../../constants/predict';
import { useAddToken } from '../../../hooks/tokens/useAddToken';
import { CHAIN_IDS } from '@metamask/transaction-controller';

export function PredictDepositInfo() {
  useNavbar(strings('confirm.title.predict_deposit'));

  useAddToken({
    chainId: CHAIN_IDS.POLYGON,
    decimals: POLYGON_USDCE.decimals,
    name: POLYGON_USDCE.name,
    symbol: POLYGON_USDCE.symbol,
    tokenAddress: POLYGON_USDCE.address,
  });

  return <CustomAmountInfo currency={PREDICT_CURRENCY} />;
}

import React from 'react';
import useNavbar from '../../../hooks/ui/useNavbar';
import { CustomAmountInfo } from '../custom-amount-info';
import { strings } from '../../../../../../../locales/i18n';
import {
  POLYGON_USDCE_ADDRESS,
  POLYGON_USDCE_DECIMALS,
  POLYGON_USDCE_SYMBOL,
  PREDICT_CURRENCY,
} from '../../../constants/predict';
import { useAddToken } from '../../../hooks/tokens/useAddToken';
import { CHAIN_IDS } from '@metamask/transaction-controller';

export function PredictDepositInfo() {
  useNavbar(strings('confirm.title.predict_deposit'));

  useAddToken({
    chainId: CHAIN_IDS.POLYGON,
    tokenAddress: POLYGON_USDCE_ADDRESS,
    symbol: POLYGON_USDCE_SYMBOL,
    decimals: POLYGON_USDCE_DECIMALS,
  });

  return <CustomAmountInfo currency={PREDICT_CURRENCY} />;
}

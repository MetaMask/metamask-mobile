import React from 'react';
import useNavbar from '../../../hooks/ui/useNavbar';
import { CustomAmountInfo } from '../custom-amount-info';
import { strings } from '../../../../../../../locales/i18n';
import { POLYGON_PUSD, PREDICT_CURRENCY } from '../../../constants/predict';
import { useAddToken } from '../../../hooks/tokens/useAddToken';
import { CHAIN_IDS } from '@metamask/transaction-controller';

export function PredictDepositInfo() {
  useNavbar(strings('confirm.title.predict_deposit'));

  useAddToken({
    chainId: CHAIN_IDS.POLYGON,
    decimals: POLYGON_PUSD.decimals,
    name: POLYGON_PUSD.name,
    symbol: POLYGON_PUSD.symbol,
    tokenAddress: POLYGON_PUSD.address,
  });

  return <CustomAmountInfo currency={PREDICT_CURRENCY} />;
}

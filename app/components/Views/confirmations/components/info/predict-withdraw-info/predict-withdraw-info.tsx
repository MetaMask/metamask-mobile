import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import useNavbar from '../../../hooks/ui/useNavbar';
import { CustomAmountInfo } from '../custom-amount-info';
import { PredictWithdrawBalance } from '../../predict-confirmations/predict-withdraw-balance/predict-withdraw-balance';
import { POLYGON_USDCE, PREDICT_CURRENCY } from '../../../constants/predict';
import { useAddToken } from '../../../hooks/tokens/useAddToken';
import { CHAIN_IDS } from '@metamask/transaction-controller';

export function PredictWithdrawInfo() {
  useNavbar(strings('confirm.title.predict_withdraw'));

  useAddToken({
    chainId: CHAIN_IDS.POLYGON,
    decimals: POLYGON_USDCE.decimals,
    name: POLYGON_USDCE.name,
    symbol: POLYGON_USDCE.symbol,
    tokenAddress: POLYGON_USDCE.address,
  });

  return (
    <CustomAmountInfo disablePay hasMax currency={PREDICT_CURRENCY}>
      <PredictWithdrawBalance />
    </CustomAmountInfo>
  );
}

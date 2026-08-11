import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import useNavbar from '../../../hooks/ui/useNavbar';
import { CustomAmountInfo } from '../custom-amount-info';
import { PredictWithdrawBalance } from '../../predict-confirmations/predict-withdraw-balance/predict-withdraw-balance';
import { POLYGON_PUSD, PREDICT_CURRENCY } from '../../../constants/predict';
import { useAddToken } from '../../../hooks/tokens/useAddToken';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useTransactionPayWithdraw } from '../../../hooks/pay/useTransactionPayWithdraw';
import { useDefaultPaySelectedSection } from '../../../hooks/pay/useDefaultPaySelectedSection';

export function PredictWithdrawInfo() {
  useNavbar(strings('confirm.title.predict_withdraw'));
  useDefaultPaySelectedSection();

  const { canSelectWithdrawToken } = useTransactionPayWithdraw();

  useAddToken({
    chainId: CHAIN_IDS.POLYGON,
    decimals: POLYGON_PUSD.decimals,
    name: POLYGON_PUSD.name,
    symbol: POLYGON_PUSD.symbol,
    tokenAddress: POLYGON_PUSD.address,
  });

  return (
    <CustomAmountInfo
      currency={PREDICT_CURRENCY}
      disablePay={!canSelectWithdrawToken}
      hasMax
    >
      <PredictWithdrawBalance />
    </CustomAmountInfo>
  );
}

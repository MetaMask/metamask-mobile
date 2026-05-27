import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import useNavbar from '../../../hooks/ui/useNavbar';
import { CustomAmountInfo } from '../custom-amount-info';
import { PredictWithdrawBalance } from '../../predict-confirmations/predict-withdraw-balance/predict-withdraw-balance';
import { POLYGON_PUSD, PREDICT_CURRENCY } from '../../../constants/predict';
import { useAddToken } from '../../../hooks/tokens/useAddToken';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useTransactionPayWithdraw } from '../../../hooks/pay/useTransactionPayWithdraw';
import useClearConfirmationOnBackSwipe from '../../../hooks/ui/useClearConfirmationOnBackSwipe';

export function PredictWithdrawInfo() {
  const rejectConfirmation = useClearConfirmationOnBackSwipe({
    rejectOnTransitionEnd: true,
    skipNavigationOnTransitionEnd: true,
  });

  useNavbar(
    strings('confirm.title.predict_withdraw'),
    true,
    undefined,
    rejectConfirmation,
  );

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
      clearConfirmationOnBackSwipe={false}
    >
      <PredictWithdrawBalance />
    </CustomAmountInfo>
  );
}

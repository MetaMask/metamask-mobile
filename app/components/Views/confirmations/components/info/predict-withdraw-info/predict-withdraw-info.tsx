import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import useNavbar from '../../../hooks/ui/useNavbar';
import { CustomAmountInfo } from '../custom-amount-info';
import { PredictWithdrawBalance } from '../../predict-confirmations/predict-withdraw-balance/predict-withdraw-balance';
import { PREDICT_CURRENCY } from '../../../constants/predict';

export function PredictWithdrawInfo() {
  useNavbar(strings('confirm.title.predict_withdraw'));

  return (
    <CustomAmountInfo disablePay currency={PREDICT_CURRENCY}>
      <PredictWithdrawBalance />
    </CustomAmountInfo>
  );
}

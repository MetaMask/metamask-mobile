import React from 'react';
import useNavbar from '../../../hooks/ui/useNavbar';
import { CustomAmountInfo } from '../custom-amount-info';
import { strings } from '../../../../../../../locales/i18n';
import { PREDICT_CURRENCY } from '../../../constants/predict';

export function PredictDepositInfo() {
  useNavbar(strings('confirm.title.predict_deposit'));

  return <CustomAmountInfo currency={PREDICT_CURRENCY} />;
}

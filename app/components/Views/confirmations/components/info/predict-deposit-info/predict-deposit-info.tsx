import React from 'react';
import useNavbar from '../../../hooks/ui/useNavbar';
import { CustomAmountInfo } from '../custom-amount-info';

export function PredictDepositInfo() {
  useNavbar('Add Predict funds');

  return <CustomAmountInfo />;
}

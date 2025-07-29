import React from 'react';
import { View } from 'react-native';
import GasFeesDetailsRow from '../../../../components/rows/transactions/gas-fee-details-row/gas-fee-details-row';
import { EditAmount } from '../../../../components/edit-amount';
import { PayWithRow } from '../../../../components/rows/pay-with-row';
import { TotalRow } from '../../../../components/rows/total-row';

export function PerpsDeposit() {
  return (
    <View>
      <EditAmount />
      <PayWithRow />
      <GasFeesDetailsRow disableUpdate hideSpeed fiatOnly />
      <TotalRow />
    </View>
  );
}

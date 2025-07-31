import React from 'react';
import { View } from 'react-native';
import GasFeesDetailsRow from '../../../../components/rows/transactions/gas-fee-details-row/gas-fee-details-row';
import { PayWithRow } from '../../../../components/rows/pay-with-row';
import { TotalRow } from '../../../../components/rows/total-row';
import useNavbar from '../../../../hooks/ui/useNavbar';
import { EditAmount } from '../../../../components/edit-amount';

export function PerpsDeposit() {
  useNavbar('Add funds', false);

  return (
    <View>
      <EditAmount prefix="$" />
      <PayWithRow />
      <GasFeesDetailsRow disableUpdate hideSpeed fiatOnly />
      <TotalRow />
    </View>
  );
}

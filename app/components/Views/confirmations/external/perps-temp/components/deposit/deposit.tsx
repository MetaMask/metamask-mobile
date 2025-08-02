import React from 'react';
import { View } from 'react-native';
import GasFeesDetailsRow from '../../../../components/rows/transactions/gas-fee-details-row/gas-fee-details-row';
import { PayWithRow } from '../../../../components/rows/pay-with-row';
import useNavbar from '../../../../hooks/ui/useNavbar';
import { EditAmount } from '../../../../components/edit-amount';
import { strings } from '../../../../../../../../locales/i18n';
import { PayTokenBalance } from '../../../../components/pay-token-balance';

const AMOUNT_PREFIX = '$';

export function PerpsDeposit() {
  useNavbar(strings('confirm.title.perps_deposit'), false);

  return (
    <View>
      <EditAmount prefix={AMOUNT_PREFIX} />
      <PayTokenBalance />
      <PayWithRow />
      <GasFeesDetailsRow disableUpdate hideSpeed fiatOnly />
    </View>
  );
}

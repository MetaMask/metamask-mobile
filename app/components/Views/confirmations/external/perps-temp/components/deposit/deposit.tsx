import React from 'react';
import { View } from 'react-native';
import GasFeesDetailsRow from '../../../../components/rows/transactions/gas-fee-details-row/gas-fee-details-row';
import { PayWithRow } from '../../../../components/rows/pay-with-row';
import useNavbar from '../../../../hooks/ui/useNavbar';
import { EditAmount } from '../../../../components/edit-amount';
import { strings } from '../../../../../../../../locales/i18n';
import { PayTokenBalance } from '../../../../components/pay-token-balance';
import { TokenAmountNative } from '../../../../components/token-amount-native';
import { TotalRow } from '../../../../components/rows/total-row';

const AMOUNT_PREFIX = '$';

export function PerpsDeposit() {
  useNavbar(strings('confirm.title.perps_deposit'), false);

  return (
    <View>
      <EditAmount prefix={AMOUNT_PREFIX}>
        <PayTokenBalance />
      </EditAmount>
      <TokenAmountNative />
      <PayWithRow />
      <GasFeesDetailsRow disableUpdate hideSpeed fiatOnly />
      <TotalRow />
    </View>
  );
}

import React, { useState } from 'react';
import GasFeesDetailsRow from '../../../../components/rows/transactions/gas-fee-details-row/gas-fee-details-row';
import { PayWithRow } from '../../../../components/rows/pay-with-row';
import useNavbar from '../../../../hooks/ui/useNavbar';
import { EditAmount } from '../../../../components/edit-amount';
import { strings } from '../../../../../../../../locales/i18n';
import { TokenAmountNative } from '../../../../components/token-amount-native';
import { TotalRow } from '../../../../components/rows/total-row';
import InfoSection from '../../../../components/UI/info-row/info-section/info-section';
import { PayTokenBalance } from '../../../../components/pay-token-balance';
import { BridgeTimeRow } from '../../../../components/rows/bridge-time-row';
import { AlertMessage } from '../../../../components/alert-message';
import { RowAlertKey } from '../../../../components/UI/info-row/alert-row/constants';

const AMOUNT_PREFIX = '$';

export function PerpsDeposit() {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useNavbar(strings('confirm.title.perps_deposit'), false);

  const handleKeyboardShow = () => {
    setIsKeyboardVisible(true);
  };

  const handleKeyboardHide = () => {
    setIsKeyboardVisible(false);
  };

  return (
    <>
      <EditAmount
        prefix={AMOUNT_PREFIX}
        autoKeyboard
        onKeyboardShow={handleKeyboardShow}
        onKeyboardHide={handleKeyboardHide}
      >
        <PayTokenBalance />
        <AlertMessage field={RowAlertKey.Amount} />
        <TokenAmountNative />
        <InfoSection>
          <PayWithRow />
          {!isKeyboardVisible && <BridgeTimeRow />}
        </InfoSection>
        {!isKeyboardVisible && (
          <>
            <GasFeesDetailsRow disableUpdate hideSpeed fiatOnly />
            <TotalRow />
          </>
        )}
      </EditAmount>
    </>
  );
}

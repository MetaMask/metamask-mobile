import React, { useState } from 'react';
import { PayWithRow } from '../../../../components/rows/pay-with-row';
import useNavbar from '../../../../hooks/ui/useNavbar';
import { EditAmount } from '../../../../components/edit-amount';
import { strings } from '../../../../../../../../locales/i18n';
import { PayTokenAmount } from '../../../../components/pay-token-amount';
import { TotalRow } from '../../../../components/rows/total-row';
import InfoSection from '../../../../components/UI/info-row/info-section/info-section';
import { BridgeTimeRow } from '../../../../components/rows/bridge-time-row';
import { AlertMessage } from '../../../../components/alert-message';
import { RowAlertKey } from '../../../../components/UI/info-row/alert-row/constants';
import AlertBanner from '../../../../components/alert-banner';
import { Box } from '../../../../../../UI/Box/Box';
import InfoRowDivider from '../../../../components/UI/info-row-divider';
import { InfoRowDividerVariant } from '../../../../components/UI/info-row-divider/info-row-divider.styles';
import { usePerpsDepositView } from '../../hooks/usePerpsDepositView';
import { GasFeeFiatRow } from '../../../../components/rows/transactions/gas-fee-fiat-row';

const AMOUNT_PREFIX = '$';

export function PerpsDeposit() {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [inputChanged, setInputChanged] = useState(false);

  const { isFullView } = usePerpsDepositView({
    isKeyboardVisible,
  });

  useNavbar(strings('confirm.title.perps_deposit'), false);

  return (
    <>
      <EditAmount
        prefix={AMOUNT_PREFIX}
        autoKeyboard
        onKeyboardShow={() => setIsKeyboardVisible(true)}
        onKeyboardHide={() => setIsKeyboardVisible(false)}
        onKeyboardDone={() => setInputChanged(true)}
      >
        <Box gap={16}>
          {inputChanged && <AlertMessage field={RowAlertKey.Amount} />}
          <PayTokenAmount />
        </Box>
        {!isKeyboardVisible && (
          <AlertBanner field={RowAlertKey.PayWith} inline />
        )}
        <InfoSection>
          <PayWithRow />
          {isFullView && <BridgeTimeRow />}
        </InfoSection>
        {isFullView && (
          <InfoSection>
            <GasFeeFiatRow />
            <InfoRowDivider variant={InfoRowDividerVariant.Large} />
            <TotalRow />
          </InfoSection>
        )}
      </EditAmount>
    </>
  );
}

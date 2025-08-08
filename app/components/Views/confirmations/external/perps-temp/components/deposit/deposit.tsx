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
import { useAutomaticTransactionPayToken } from '../../../../hooks/pay/useAutomaticTransactionPayToken';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import GeneralAlertBanner from '../../../../components/general-alert-banner';
import { Box } from '../../../../../../UI/Box/Box';
import InfoRowDivider from '../../../../components/UI/info-row-divider';
import { InfoRowDividerVariant } from '../../../../components/UI/info-row-divider/info-row-divider.styles';

const AMOUNT_PREFIX = '$';

export function PerpsDeposit() {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useAutomaticTransactionPayToken({
    balanceOverrides: [
      {
        address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as const,
        balance: 10,
        chainId: CHAIN_IDS.ARBITRUM,
      },
    ],
  });

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
        <Box gap={16}>
          <PayTokenBalance />
          <AlertMessage field={RowAlertKey.Amount} />
          <TokenAmountNative />
        </Box>
        <GeneralAlertBanner field={RowAlertKey.PayWith} inline />
        <InfoSection>
          <PayWithRow />
          {!isKeyboardVisible && <BridgeTimeRow />}
        </InfoSection>
        {!isKeyboardVisible && (
          <InfoSection>
            <GasFeesDetailsRow disableUpdate hideSpeed fiatOnly noSection />
            <InfoRowDivider variant={InfoRowDividerVariant.Large} />
            <TotalRow />
          </InfoSection>
        )}
      </EditAmount>
    </>
  );
}

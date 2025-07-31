import React, { useCallback } from 'react';
import InfoRow from '../../UI/info-row';
import InfoSection from '../../UI/info-row/info-section';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../../constants/navigation/Routes';
import { TokenPill } from '../../token-pill/token-pill';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { useTransactionBridgeQuotes } from '../../../hooks/pay/useTransactionBridgeQuotes';
import { Box } from '../../../../../UI/Box/Box';

export function PayWithRow() {
  const navigation = useNavigation();
  const { payToken } = useTransactionPayToken();
  useTransactionBridgeQuotes();

  const handleClick = useCallback(() => {
    navigation.navigate(Routes.CONFIRMATION_PAY_WITH_MODAL);
  }, [navigation]);

  return (
    <>
      <InfoSection>
        <InfoRow label="Pay with">
          <Box onTouchEnd={handleClick}>
            <TokenPill address={payToken.address} chainId={payToken.chainId} />
          </Box>
        </InfoRow>
      </InfoSection>
    </>
  );
}

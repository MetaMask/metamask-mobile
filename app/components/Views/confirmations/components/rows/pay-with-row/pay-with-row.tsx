import React, { useCallback } from 'react';
import InfoRow from '../../UI/info-row';
import InfoSection from '../../UI/info-row/info-section';
import { Box } from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../../constants/navigation/Routes';
import { TokenPill } from '../../token-pill/token-pill';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';

export function PayWithRow() {
  const navigation = useNavigation();
  const { payToken } = useTransactionPayToken();

  const handleClick = useCallback(() => {
    navigation.navigate(Routes.CONFIRMATION_PAY_WITH_MODAL, {
      minimumFiatBalance: 2,
    });
  }, [navigation]);

  return (
    <>
      <InfoSection>
        <InfoRow label="Pay with" tooltip="Test 1 2 3">
          <Box onTouchEnd={handleClick}>
            <TokenPill address={payToken.address} chainId={payToken.chainId} />
          </Box>
        </InfoRow>
      </InfoSection>
    </>
  );
}

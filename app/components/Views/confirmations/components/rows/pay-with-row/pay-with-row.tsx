import React, { useCallback } from 'react';
import InfoRow from '../../UI/info-row';
import InfoSection from '../../UI/info-row/info-section';
import { Box } from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../../constants/navigation/Routes';
import { usePayAsset } from '../../../hooks/transactions/usePayAsset';
import { TokenPill } from '../../token-pill/token-pill';

export function PayWithRow() {
  const navigation = useNavigation();
  const { payAsset } = usePayAsset();

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
            <TokenPill address={payAsset.address} chainId={payAsset.chainId} />
          </Box>
        </InfoRow>
      </InfoSection>
    </>
  );
}

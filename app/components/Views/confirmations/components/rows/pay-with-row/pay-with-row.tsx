import React, { useCallback } from 'react';
import InfoRow from '../../UI/info-row';
import InfoSection from '../../UI/info-row/info-section';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../../constants/navigation/Routes';
import { TokenPill } from '../../token-pill/token-pill';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { useTransactionBridgeQuotes } from '../../../hooks/pay/useTransactionBridgeQuotes';
import Icon, {
  IconName,
} from '../../../../../../component-library/components/Icons/Icon';
import { Box } from '../../../../../UI/Box/Box';
import { AlignItems, FlexDirection } from '../../../../../UI/Box/box.types';

export function PayWithRow() {
  const navigation = useNavigation();
  const { payToken } = useTransactionPayToken();
  const { quotes } = useTransactionBridgeQuotes();

  const handleClick = useCallback(() => {
    navigation.navigate(Routes.CONFIRMATION_PAY_WITH_MODAL);
  }, [navigation]);

  return (
    <>
      <InfoSection>
        <InfoRow label="Pay with">
          <Box
            onTouchEnd={handleClick}
            flexDirection={FlexDirection.Row}
            alignItems={AlignItems.center}
          >
            {quotes?.length && <Icon name={IconName.CheckBold} />}
            <TokenPill address={payToken.address} chainId={payToken.chainId} />
          </Box>
        </InfoRow>
      </InfoSection>
    </>
  );
}

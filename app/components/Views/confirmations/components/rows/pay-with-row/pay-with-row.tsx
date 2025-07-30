import React, { useCallback } from 'react';
import InfoRow from '../../UI/info-row';
import InfoSection from '../../UI/info-row/info-section';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../../constants/navigation/Routes';
import { TokenPill } from '../../token-pill/token-pill';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { Box } from '../../../../../UI/Box/Box';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useConfirmationContext } from '../../../context/confirmation-context';
import AnimatedSpinner, { SpinnerSize } from '../../../../../UI/AnimatedSpinner';

export function PayWithRow() {
  const navigation = useNavigation();
  const { payToken } = useTransactionPayToken();
  const { quotes, quotesLoading } = useConfirmationContext();

  const handleClick = useCallback(() => {
    navigation.navigate(Routes.CONFIRMATION_PAY_WITH_MODAL);
  }, [navigation]);

  const estimatedTimeSeconds = quotes?.[0]?.estimatedProcessingTimeInSeconds;

  return (
    <>
      <InfoSection>
        <InfoRow label="Pay with">
          <Box onTouchEnd={handleClick}>
            <TokenPill address={payToken.address} chainId={payToken.chainId} />
          </Box>
        </InfoRow>
        <InfoRow label="Est. time">
          {quotesLoading ? (
            <AnimatedSpinner size={SpinnerSize.SM} />
          ) : (
            <Text>{estimatedTimeSeconds} sec</Text>
          )}
        </InfoRow>
      </InfoSection>
    </>
  );
}

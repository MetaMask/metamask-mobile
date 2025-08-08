import React, { useCallback } from 'react';
import InfoRow from '../../UI/info-row';
import InfoSection from '../../UI/info-row/info-section';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../../constants/navigation/Routes';
import { TokenPill } from '../../token-pill/';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import Text from '../../../../../../component-library/components/Texts/Text';
import AnimatedSpinner, {
  SpinnerSize,
} from '../../../../../UI/AnimatedSpinner';
import { strings } from '../../../../../../../locales/i18n';
import { TouchableOpacity } from 'react-native';
import { useTransactionBridgeQuotes } from '../../../hooks/pay/useTransactionBridgeQuotes';

export function PayWithRow() {
  const navigation = useNavigation();
  const { payToken } = useTransactionPayToken();
  const { quotes, loading } = useTransactionBridgeQuotes();

  const handleClick = useCallback(() => {
    navigation.navigate(Routes.CONFIRMATION_PAY_WITH_MODAL);
  }, [navigation]);

  const showEstimate = loading || Boolean(quotes?.length);

  const estimatedTimeSeconds = quotes?.reduce(
    (acc, quote) => acc + quote.estimatedProcessingTimeInSeconds,
    0,
  );

  return (
    <InfoSection>
      <InfoRow label={strings('confirm.label.pay_with')}>
        <TouchableOpacity onPress={handleClick}>
          <TokenPill address={payToken.address} chainId={payToken.chainId} />
        </TouchableOpacity>
      </InfoRow>
      {showEstimate && (
        <InfoRow label={strings('confirm.label.bridge_estimated_time')}>
          {loading ? (
            <AnimatedSpinner size={SpinnerSize.SM} />
          ) : (
            <Text>
              {estimatedTimeSeconds} {strings('unit.second')}
            </Text>
          )}
        </InfoRow>
      )}
    </InfoSection>
  );
}

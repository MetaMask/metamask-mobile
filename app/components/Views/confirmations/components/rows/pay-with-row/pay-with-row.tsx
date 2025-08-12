import React, { useCallback } from 'react';
import InfoRow from '../../UI/info-row';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../../constants/navigation/Routes';
import { TokenPill } from '../../token-pill/';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { strings } from '../../../../../../../locales/i18n';
import { TouchableOpacity } from 'react-native';
import { useTransactionBridgeQuotes } from '../../../hooks/pay/useTransactionBridgeQuotes';
import { useTransactionRequiredFiat } from '../../../hooks/pay/useTransactionRequiredFiat';
import AnimatedSpinner, {
  SpinnerSize,
} from '../../../../../UI/AnimatedSpinner';

export function PayWithRow() {
  const navigation = useNavigation();
  const { payToken } = useTransactionPayToken();
  const { totalFiat } = useTransactionRequiredFiat();

  useTransactionBridgeQuotes();

  const handleClick = useCallback(() => {
    navigation.navigate(Routes.CONFIRMATION_PAY_WITH_MODAL, {
      minimumFiatBalance: totalFiat,
    });
  }, [navigation, totalFiat]);

  return (
    <InfoRow label={strings('confirm.label.pay_with')}>
      <TouchableOpacity onPress={handleClick}>
        {!payToken ? (
          <AnimatedSpinner size={SpinnerSize.SM} />
        ) : (
          <TokenPill
            address={payToken.address}
            chainId={payToken.chainId}
            showArrow
          />
        )}
      </TouchableOpacity>
    </InfoRow>
  );
}

import React, { useCallback } from 'react';
import InfoRow from '../../UI/info-row';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../../constants/navigation/Routes';
import { TokenPill } from '../../token-pill/';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { strings } from '../../../../../../../locales/i18n';
import { TouchableOpacity } from 'react-native';
import { useTransactionBridgeQuotes } from '../../../hooks/pay/useTransactionBridgeQuotes';

export function PayWithRow() {
  const navigation = useNavigation();
  const { payToken } = useTransactionPayToken();

  useTransactionBridgeQuotes();

  const handleClick = useCallback(() => {
    navigation.navigate(Routes.CONFIRMATION_PAY_WITH_MODAL);
  }, [navigation]);

  return (
    <InfoRow label={strings('confirm.label.pay_with')}>
      <TouchableOpacity onPress={handleClick}>
        <TokenPill address={payToken.address} chainId={payToken.chainId} />
      </TouchableOpacity>
    </InfoRow>
  );
}

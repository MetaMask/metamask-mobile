import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { useMusdConversionTokens } from './useMusdConversionTokens';
import { useTransactionPayIsMaxAmount } from '../../../Views/confirmations/hooks/pay/useTransactionPayData';

export const useMusdConfirmNavigation = () => {
  const navigation = useNavigation();

  const isMaxAmount = useTransactionPayIsMaxAmount();

  const { tokens: conversionTokens } = useMusdConversionTokens();

  const isLastConvertibleToken = conversionTokens.length <= 1;

  const navigateOnConfirm = useCallback(() => {
    if (isMaxAmount && isLastConvertibleToken) {
      navigation.navigate(Routes.WALLET_VIEW);
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate(Routes.WALLET_VIEW);
  }, [navigation, isMaxAmount, isLastConvertibleToken]);

  return {
    navigateOnConfirm,
  };
};

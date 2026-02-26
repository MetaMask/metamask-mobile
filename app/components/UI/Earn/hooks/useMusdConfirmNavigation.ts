import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import { selectMusdQuickConvertEnabledFlag } from '../selectors/featureFlags';

export const useMusdConfirmNavigation = () => {
  const navigation = useNavigation();
  const isMusdQuickConvertEnabled = useSelector(
    selectMusdQuickConvertEnabledFlag,
  );

  const navigateOnConfirm = useCallback(() => {
    if (isMusdQuickConvertEnabled && navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate(Routes.WALLET_VIEW);
  }, [isMusdQuickConvertEnabled, navigation]);

  return {
    navigateOnConfirm,
  };
};

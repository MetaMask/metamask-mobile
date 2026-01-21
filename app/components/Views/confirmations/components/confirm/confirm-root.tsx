import { useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';

import Routes from '../../../../../constants/navigation/Routes';
import { useFullScreenConfirmation } from '../../hooks/ui/useFullScreenConfirmation';

export const ConfirmRoot = () => {
  const { isFullScreenConfirmation } = useFullScreenConfirmation();
  const navigation = useNavigation();

  useEffect(() => {
    if (isFullScreenConfirmation) {
      return;
    }
    navigation.navigate(Routes.CONFIRMATION_REQUEST_MODAL);
  }, [isFullScreenConfirmation, navigation]);

  return null;
};

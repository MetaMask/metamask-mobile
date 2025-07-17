import { useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';

import Routes from '../../../../../constants/navigation/Routes';
import { useFullScreenConfirmation } from '../../hooks/ui/useFullScreenConfirmation';
import { useConfirmationRedesignEnabled } from '../../hooks/useConfirmationRedesignEnabled';

export const ConfirmRoot = () => {
  const { isRedesignedEnabled } = useConfirmationRedesignEnabled();
  const { isFullScreenConfirmation } = useFullScreenConfirmation();
  const navigation = useNavigation();

  useEffect(() => {
    if (isRedesignedEnabled) {
      if (isFullScreenConfirmation) {
        return;
      }
      navigation.navigate(Routes.CONFIRMATION_REQUEST_MODAL);
    }
  }, [isFullScreenConfirmation, isRedesignedEnabled, navigation]);

  return null;
};

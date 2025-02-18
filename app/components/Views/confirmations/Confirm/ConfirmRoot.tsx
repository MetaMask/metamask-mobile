import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';

import Routes from '../../../../constants/navigation/Routes';
import { useFlatConfirmation } from '../hooks/useFlatConfirmation';
import { useConfirmationRedesignEnabled } from '../hooks/useConfirmationRedesignEnabled';

export const ConfirmRoot = () => {
  const { isRedesignedEnabled } = useConfirmationRedesignEnabled();
  const { isFlatConfirmation } = useFlatConfirmation();
  const navigation = useNavigation();

  useEffect(() => {
    if (isRedesignedEnabled) {
      navigation.navigate(
        isFlatConfirmation ? Routes.CONFIRM_FLAT_PAGE : Routes.CONFIRM_MODAL,
      );
    }
  }, [isFlatConfirmation, isRedesignedEnabled, navigation]);

  return null;
};

import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';

import { handleSendPageNavigation, SendNavigationParams } from '../utils/send';

export const useSendNavigation = () => {
  const { navigate } = useNavigation();

  const navigateToSendPage = useCallback(
    (params: SendNavigationParams) => {
      handleSendPageNavigation(navigate, params);
    },
    [navigate],
  );

  return { navigateToSendPage };
};

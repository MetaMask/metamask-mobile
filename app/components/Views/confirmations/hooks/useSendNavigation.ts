import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';

import { handleSendPageNavigation, SendNavigationParams } from '../utils/send';

export const useSendNavigation = () => {
  const { navigate } = useNavigation<AppNavigationProp>();

  const navigateToSendPage = useCallback(
    (params: SendNavigationParams) => {
      handleSendPageNavigation(navigate, params);
    },
    [navigate],
  );

  return { navigateToSendPage };
};

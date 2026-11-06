import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';

import { handleSendPageNavigation, SendNavigationParams } from '../utils/send';
import { useWatchOnlyGuard } from '../../../hooks/useWatchOnlyGuard';

export const useSendNavigation = () => {
  const { navigate } = useNavigation<AppNavigationProp>();
  const { guard: guardWatchOnly } = useWatchOnlyGuard();

  const navigateToSendPage = useCallback(
    (params: SendNavigationParams) => {
      if (guardWatchOnly()) {
        return;
      }
      handleSendPageNavigation(navigate, params);
    },
    [guardWatchOnly, navigate],
  );

  return { navigateToSendPage };
};

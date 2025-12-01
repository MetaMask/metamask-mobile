import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import { selectSendRedesignFlags } from '../../../../selectors/featureFlagController/confirmations';
import { handleSendPageNavigation, SendNavigationParams } from '../utils/send';

export const useSendNavigation = () => {
  const { navigate } = useNavigation();
  const { enabled: isSendRedesignEnabled } = useSelector(
    selectSendRedesignFlags,
  );

  const navigateToSendPage = useCallback(
    (params: Omit<SendNavigationParams, 'isSendRedesignEnabled'>) => {
      handleSendPageNavigation(navigate, {
        ...params,
        isSendRedesignEnabled,
      });
    },
    [navigate, isSendRedesignEnabled],
  );

  return { navigateToSendPage };
};

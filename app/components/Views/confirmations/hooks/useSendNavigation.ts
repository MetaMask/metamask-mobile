import { Nft } from '@metamask/assets-controllers';
import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import { selectSendRedesignFlags } from '../../../../selectors/featureFlagController/confirmations';
import { handleSendPageNavigation } from '../utils/send';
import { AssetType } from '../types/token';

export const useSendNavigation = () => {
  const { navigate } = useNavigation();
  const { enabled: isSendRedesignEnabled } = useSelector(
    selectSendRedesignFlags,
  );

  const navigateToSendPage = useCallback(
    (location: string, asset?: AssetType | Nft) => {
      handleSendPageNavigation(
        navigate,
        location,
        isSendRedesignEnabled,
        asset,
      );
    },
    [navigate, isSendRedesignEnabled],
  );

  return { navigateToSendPage };
};

import { Nft } from '@metamask/assets-controllers';
import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';

import { handleSendPageNavigation } from '../utils/send';
import { AssetType } from '../types/token';

export const useSendNavigation = () => {
  const { navigate } = useNavigation();

  const navigateToSendPage = useCallback(
    (asset?: AssetType | Nft) => {
      handleSendPageNavigation(navigate, asset);
    },
    [navigate],
  );

  return { navigateToSendPage };
};

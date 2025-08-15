import { RouteProp, useRoute } from '@react-navigation/native';
import { useEffect } from 'react';

import { AssetType } from '../../types/token';
import { useSendContext } from '../../context/send-context';

const useRouteParams = () => {
  const route =
    useRoute<RouteProp<Record<string, { asset: AssetType }>, string>>();
  const paramsAsset = route?.params?.asset;
  const { updateAsset } = useSendContext();

  useEffect(() => {
    if (paramsAsset) {
      updateAsset(paramsAsset);
    }
  }, [paramsAsset, updateAsset]);
};

export default useRouteParams;

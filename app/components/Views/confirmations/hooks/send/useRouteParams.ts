import { useEffect } from 'react';

import { useParams } from '../../../../../util/navigation/navUtils';
import { AssetType } from '../../types/token';
import { useSendContext } from '../../context/send-context';

export const useRouteParams = () => {
  const { asset: paramsAsset } = useParams<{
    asset: AssetType;
  }>();
  const { updateAsset } = useSendContext();

  useEffect(() => {
    if (paramsAsset) {
      updateAsset(paramsAsset);
    }
  }, [paramsAsset, updateAsset]);
};

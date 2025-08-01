import { useEffect } from 'react';

import { useParams } from '../../../../../util/navigation/navUtils';
import { AssetType } from '../../types/token';
import { useSendContext } from '../../context/send-context';

export const useRouteParams = () => {
  const { asset: paramsAsset, chainId } = useParams<{
    asset: AssetType;
    chainId: string;
  }>();
  const { updateAsset } = useSendContext();

  useEffect(() => {
    if (paramsAsset) {
      updateAsset(paramsAsset);
    }
    //todo: chainId to be used to get native asset for the chain if asset if not passed
    // eslint-disable-next-line no-console
    console.log('chainid', chainId);
  }, [chainId, paramsAsset, updateAsset]);
};

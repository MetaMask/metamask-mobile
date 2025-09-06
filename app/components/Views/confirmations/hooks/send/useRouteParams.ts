import { useEffect } from 'react';

import { useParams } from '../../../../../util/navigation/navUtils';
import { AssetType, Nft } from '../../types/token';
import { useSendContext } from '../../context/send-context';
import { useAccountTokens } from './useAccountTokens';
import { useEVMNfts } from './useNfts';

export const useRouteParams = () => {
  const tokens = useAccountTokens();
  const nfts = useEVMNfts();

  const { asset: paramsAsset } = useParams<{
    asset: AssetType;
  }>();
  const { updateAsset } = useSendContext();

  useEffect(() => {
    if (paramsAsset) {
      let asset: AssetType | Nft | undefined = tokens.find(
        ({ address, chainId }) =>
          address === paramsAsset.address &&
          chainId?.toLowerCase() === paramsAsset.chainId?.toLowerCase(),
      );
      if (!asset && nfts.length) {
        asset = nfts.find(
          ({ address, chainId }) =>
            address === paramsAsset.address &&
            chainId?.toLowerCase() === paramsAsset.chainId?.toLowerCase(),
        );
      }
      updateAsset(asset ?? paramsAsset);
    }
  }, [paramsAsset, nfts, tokens, updateAsset]);
};

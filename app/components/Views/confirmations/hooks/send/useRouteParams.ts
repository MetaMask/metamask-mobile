import { toHex } from 'viem';
import { isAddress as isEvmAddress } from 'ethers/lib/utils';
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
      const paramChainId =
        isEvmAddress(paramsAsset.address) && paramsAsset?.chainId
          ? toHex(paramsAsset?.chainId)
          : paramsAsset?.chainId?.toString().toLowerCase();

      let asset: AssetType | Nft | undefined = tokens.find(
        ({ address, chainId }) =>
          address === paramsAsset.address &&
          chainId?.toLowerCase() === paramChainId,
      );
      if (!asset && nfts.length) {
        asset = nfts.find(
          ({ address, chainId }) =>
            address === paramsAsset.address &&
            chainId?.toLowerCase() === paramChainId,
        );
      }
      updateAsset(asset ?? paramsAsset);
    }
  }, [paramsAsset, nfts, tokens, updateAsset]);
};

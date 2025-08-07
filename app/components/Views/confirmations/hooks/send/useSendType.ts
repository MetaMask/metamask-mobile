import { isAddress as isEvmAddress } from 'ethers/lib/utils';
import { isSolanaChainId } from '@metamask/bridge-controller';
import { useMemo } from 'react';

import { useSendContext } from '../../context/send-context';

export const useSendType = () => {
  const { asset } = useSendContext();
  const isEvmSendType = useMemo(
    () => (asset?.address ? isEvmAddress(asset.address) : undefined),
    [asset],
  );
  const isSolanaSendType = useMemo(
    () => (asset?.chainId ? isSolanaChainId(asset.chainId) : undefined),
    [asset],
  );
  const assetIsNative = asset ? asset.isNative : undefined;

  return useMemo(
    () => ({
      isEvmSendType,
      isEvmNativeSendType: isEvmSendType && assetIsNative,
      isNonEvmSendType: isSolanaSendType,
      isNonEvmNativeSendType: isSolanaSendType && assetIsNative,
      isSolanaSendType,
    }),
    [isEvmSendType, isSolanaSendType, assetIsNative],
  );
};

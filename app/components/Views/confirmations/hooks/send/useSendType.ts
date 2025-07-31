import { isAddress as isEvmAddress } from 'ethers/lib/utils';
import { isAddress as isSolanaAddress } from '@solana/addresses';
import { useMemo } from 'react';

import { isNonEvmAddress } from '../../../../../core/Multichain/utils';
import { useSendContext } from '../../context/send-context';

export const useSendType = () => {
  const { asset } = useSendContext();

  const isEvmSendType = useMemo(() => {
    if (!asset?.address) {
      return undefined;
    }
    return isEvmAddress(asset.address);
  }, [asset?.address, isNonEvmAddress]);

  const iSolanaSendType = useMemo(() => {
    if (!asset?.address) {
      return undefined;
    }
    return isSolanaAddress(asset.address);
  }, [asset?.address, isSolanaAddress]);

  const assetIsNative = asset ? asset.isNative : undefined;

  return {
    isEvmSendType,
    isEvmNativeSendType: isEvmSendType && assetIsNative,
    isNonEvmSendType: !isEvmSendType,
    isNonEvmNativeSendType: !isEvmSendType && assetIsNative,
    iSolanaSendType,
  };
};

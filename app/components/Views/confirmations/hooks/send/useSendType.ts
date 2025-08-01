import { isAddress as isEvmAddress } from 'ethers/lib/utils';
import { isAddress as isSolanaAddress } from '@solana/addresses';
import { useMemo } from 'react';

import { useSendContext } from '../../context/send-context';

export const useSendType = () => {
  const { from, asset } = useSendContext();

  const isEvmSendType = useMemo(() => isEvmAddress(from), [from]);

  const isSolanaSendType = useMemo(() => isSolanaAddress(from), [from]);

  const assetIsNative = asset ? asset.isNative : undefined;

  return useMemo(
    () => ({
      isEvmSendType,
      isEvmNativeSendType: isEvmSendType && assetIsNative,
      isNonEvmSendType: !isEvmSendType,
      isNonEvmNativeSendType: !isEvmSendType && assetIsNative,
      isSolanaSendType,
    }),
    [isEvmSendType, isSolanaSendType, assetIsNative],
  );
};

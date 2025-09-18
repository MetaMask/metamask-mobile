import { isAddress as isEvmAddress } from 'ethers/lib/utils';
import {
  /// BEGIN:ONLY_INCLUDE_IF(bitcoin)
  isBitcoinChainId,
  /// END:ONLY_INCLUDE_IF
  isSolanaChainId,
} from '@metamask/bridge-controller';
import { useMemo } from 'react';

import { useSendContext } from '../../context/send-context';
import { isNonEvmChainId } from '../../../../../core/Multichain/utils';

export const useSendType = () => {
  const { asset } = useSendContext();
  const isEvmSendType = useMemo(
    () => (asset?.address ? isEvmAddress(asset.address) : undefined),
    [asset?.address],
  );
  const isNonEvmSendType = useMemo(
    () => (asset?.chainId ? isNonEvmChainId(asset.chainId) : undefined),
    [asset?.chainId],
  );

  const isSolanaSendType = useMemo(
    () => (asset?.chainId ? isSolanaChainId(asset.chainId) : undefined),
    [asset?.chainId],
  );

  /// BEGIN:ONLY_INCLUDE_IF(bitcoin)
  const isBitcoinSendType = useMemo(
    () => (asset?.chainId ? isBitcoinChainId(asset.chainId) : undefined),
    [asset?.chainId],
  );
  /// END:ONLY_INCLUDE_IF

  const assetIsNative =
    asset && 'isNative' in asset ? Boolean(asset.isNative) : undefined;

  return useMemo(
    () => ({
      isEvmSendType,
      isEvmNativeSendType: isEvmSendType && assetIsNative,
      isNonEvmNativeSendType: isNonEvmSendType && assetIsNative,
      isNonEvmSendType,
      isSolanaSendType,
      /// BEGIN:ONLY_INCLUDE_IF(bitcoin)
      isBitcoinSendType,
      /// END:ONLY_INCLUDE_IF
    }),
    [
      isEvmSendType,
      isNonEvmSendType,
      assetIsNative,
      isSolanaSendType,
      /// BEGIN:ONLY_INCLUDE_IF(bitcoin)
      isBitcoinSendType,
      /// END:ONLY_INCLUDE_IF
    ],
  );
};

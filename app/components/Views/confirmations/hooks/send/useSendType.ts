import { isAddress as isEvmAddress } from 'ethers/lib/utils';
import {
  /// BEGIN:ONLY_INCLUDE_IF(bitcoin)
  isBitcoinChainId,
  /// END:ONLY_INCLUDE_IF
  isSolanaChainId,
} from '@metamask/bridge-controller';
import { useMemo } from 'react';

import { useSendContext } from '../../context/send-context';
import {
  isNonEvmChainId,
  /// BEGIN:ONLY_INCLUDE_IF(tron)
  isTronChainId,
  /// END:ONLY_INCLUDE_IF
} from '../../../../../core/Multichain/utils';
import { useParams } from '../../../../../util/navigation/navUtils';

export const useSendType = () => {
  const { asset } = useSendContext();
  const { predefinedRecipient } = useParams<{
    predefinedRecipient: {
      address: string;
      isEvm: boolean;
      isBitcoin: boolean;
      isSolana: boolean;
      isTron: boolean;
    };
  }>();

  const {
    isEvm: isPredefinedEvm,
    isBitcoin: isPredefinedBitcoin,
    isSolana: isPredefinedSolana,
    isTron: isPredefinedTron,
  } = predefinedRecipient || {};

  const isPredefinedNonEvm = useMemo(
    () =>
      isPredefinedEvm ||
      isPredefinedSolana ||
      isPredefinedBitcoin ||
      isPredefinedTron,
    [
      isPredefinedEvm,
      isPredefinedSolana,
      isPredefinedBitcoin,
      isPredefinedTron,
    ],
  );

  const isEvmSendType = useMemo(
    () =>
      isPredefinedEvm ||
      (asset?.address ? isEvmAddress(asset.address) : undefined),
    [asset?.address, isPredefinedEvm],
  );
  const isNonEvmSendType = useMemo(
    () =>
      isPredefinedNonEvm ||
      (asset?.chainId ? isNonEvmChainId(asset.chainId) : undefined),
    [asset?.chainId, isPredefinedNonEvm],
  );

  const isSolanaSendType = useMemo(
    () =>
      isPredefinedSolana ||
      (asset?.chainId ? isSolanaChainId(asset.chainId) : undefined),
    [asset?.chainId, isPredefinedSolana],
  );

  /// BEGIN:ONLY_INCLUDE_IF(bitcoin)
  const isBitcoinSendType = useMemo(
    () =>
      isPredefinedBitcoin ||
      (asset?.chainId ? isBitcoinChainId(asset.chainId) : undefined),
    [asset?.chainId, isPredefinedBitcoin],
  );
  /// END:ONLY_INCLUDE_IF

  /// BEGIN:ONLY_INCLUDE_IF(tron)
  const isTronSendType = useMemo(
    () =>
      isPredefinedTron ||
      (asset?.chainId ? isTronChainId(asset.chainId) : undefined),
    [asset?.chainId, isPredefinedTron],
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
      /// BEGIN:ONLY_INCLUDE_IF(tron)
      isTronSendType,
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
      /// BEGIN:ONLY_INCLUDE_IF(tron)
      isTronSendType,
      /// END:ONLY_INCLUDE_IF
    ],
  );
};

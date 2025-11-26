import { isAddress as isEvmAddress } from 'ethers/lib/utils';
import {
  /// BEGIN:ONLY_INCLUDE_IF(bitcoin)
  isBitcoinChainId,
  /// END:ONLY_INCLUDE_IF
  isSolanaChainId,
} from '@metamask/bridge-controller';
import { useCallback, useMemo } from 'react';

import { useSendContext } from '../../context/send-context';
import {
  isNonEvmChainId,
  /// BEGIN:ONLY_INCLUDE_IF(tron)
  isTronChainId,
  /// END:ONLY_INCLUDE_IF
} from '../../../../../core/Multichain/utils';
import { useParams } from '../../../../../util/navigation/navUtils';
import { PredefinedRecipient } from '../../utils/send';

export const useSendType = () => {
  const { asset } = useSendContext();
  const { predefinedRecipient } =
    useParams<{
      predefinedRecipient: PredefinedRecipient;
    }>() || {};

  const isPredefinedEvm = predefinedRecipient?.chainType === 'evm';
  const isPredefinedBitcoin = predefinedRecipient?.chainType === 'bitcoin';
  const isPredefinedSolana = predefinedRecipient?.chainType === 'solana';
  const isPredefinedTron = predefinedRecipient?.chainType === 'tron';

  const isPredefinedNonEvm =
    predefinedRecipient?.chainType && predefinedRecipient.chainType !== 'evm';

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

  const createChainTypeCheck = useCallback(
    (
      isPredefined: boolean | undefined,
      chainChecker: (chainId: string) => boolean,
    ) =>
      isPredefined ||
      (asset?.chainId ? chainChecker(asset.chainId) : undefined),
    [asset?.chainId],
  );

  const isSolanaSendType = useMemo(
    () => createChainTypeCheck(isPredefinedSolana, isSolanaChainId),
    [createChainTypeCheck, isPredefinedSolana],
  );

  /// BEGIN:ONLY_INCLUDE_IF(bitcoin)
  const isBitcoinSendType = useMemo(
    () => createChainTypeCheck(isPredefinedBitcoin, isBitcoinChainId),
    [createChainTypeCheck, isPredefinedBitcoin],
  );
  /// END:ONLY_INCLUDE_IF

  /// BEGIN:ONLY_INCLUDE_IF(tron)
  const isTronSendType = useMemo(
    () => createChainTypeCheck(isPredefinedTron, isTronChainId),
    [createChainTypeCheck, isPredefinedTron],
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

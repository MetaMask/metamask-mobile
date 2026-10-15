import { isAddress as isEvmAddress } from 'ethers/lib/utils';
import {
  isBitcoinChainId,
  isSolanaChainId,
  isStellarChainId,
} from '@metamask/bridge-controller';
import { useCallback, useMemo } from 'react';

import { useSendContext } from '../../context/send-context';
import {
  isNonEvmChainId,
  isTronChainId,
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
  const isPredefinedStellar = predefinedRecipient?.chainType === 'stellar';

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

  const isBitcoinSendType = useMemo(
    () => createChainTypeCheck(isPredefinedBitcoin, isBitcoinChainId),
    [createChainTypeCheck, isPredefinedBitcoin],
  );

  const isTronSendType = useMemo(
    () => createChainTypeCheck(isPredefinedTron, isTronChainId),
    [createChainTypeCheck, isPredefinedTron],
  );

  const isStellarSendType = useMemo(
    () => createChainTypeCheck(isPredefinedStellar, isStellarChainId),
    [createChainTypeCheck, isPredefinedStellar],
  );

  const assetIsNative =
    asset && 'isNative' in asset ? Boolean(asset.isNative) : undefined;

  return useMemo(
    () => ({
      isEvmSendType,
      isPredefinedEvm,
      isEvmNativeSendType: isEvmSendType && assetIsNative,
      isNonEvmNativeSendType: isNonEvmSendType && assetIsNative,
      isNonEvmSendType,
      isSolanaSendType,
      isPredefinedSolana,
      isBitcoinSendType,
      isPredefinedBitcoin,
      isTronSendType,
      isPredefinedTron,
      isStellarSendType,
      isPredefinedStellar,
    }),
    [
      isEvmSendType,
      isPredefinedEvm,
      isNonEvmSendType,
      assetIsNative,
      isSolanaSendType,
      isPredefinedSolana,
      isBitcoinSendType,
      isPredefinedBitcoin,
      isTronSendType,
      isPredefinedTron,
      isStellarSendType,
      isPredefinedStellar,
    ],
  );
};

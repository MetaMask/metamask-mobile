import { useCallback } from 'react';
import { TrxScope } from '@metamask/keyring-api';
import { CaipAssetType, CaipChainId } from '@metamask/utils';

import { AssetType } from '../../../types/token';
import { useSendContext } from '../../../context/send-context';
import { useBalance } from '../useBalance';
import { getTronMaxSendableAmountWithFallback } from './getTronMaxSendableAmountWithFallback';
import type { GetMaxSendableAmount } from './types';

const MAX_SENDABLE_AMOUNT_GETTERS: Partial<
  Record<CaipChainId, GetMaxSendableAmount>
> = {
  [TrxScope.Mainnet]: getTronMaxSendableAmountWithFallback,
  [TrxScope.Nile]: getTronMaxSendableAmountWithFallback,
  [TrxScope.Shasta]: getTronMaxSendableAmountWithFallback,
};

/**
 * Returns the maximum amount a non-EVM network allows to be sent, routing each
 * network to its own getter. Returns undefined when the network has no getter,
 * leaving the caller to fall back to the full balance.
 */
export const useNonEvmMaxAmount = () => {
  const { asset, fromAccount, to } = useSendContext();
  const { rawBalanceBN } = useBalance();
  const getMaxSendableAmount = asset?.chainId
    ? MAX_SENDABLE_AMOUNT_GETTERS[asset.chainId as CaipChainId]
    : undefined;

  const getNonEvmMaxAmount = useCallback(async () => {
    if (!getMaxSendableAmount || !asset || !fromAccount) {
      return undefined;
    }

    const nonEvmAsset = asset as AssetType;
    const { amount } = await getMaxSendableAmount({
      fromAccount,
      assetId: nonEvmAsset.assetId as CaipAssetType,
      toAddress: to,
      balance: {
        rawBalanceBN,
        decimals: nonEvmAsset.decimals,
        isNative: Boolean(nonEvmAsset.isNative),
      },
    });

    return amount;
  }, [asset, fromAccount, getMaxSendableAmount, rawBalanceBN, to]);

  return {
    getNonEvmMaxAmount,
    isNonEvmMaxSupported: Boolean(getMaxSendableAmount),
  };
};

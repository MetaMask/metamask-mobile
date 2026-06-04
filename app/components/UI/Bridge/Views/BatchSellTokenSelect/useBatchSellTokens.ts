import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  formatAddressToAssetId,
  formatChainIdToCaip,
} from '@metamask/bridge-controller';
import { CaipAssetType, CaipChainId } from '@metamask/utils';

import { selectBatchSellDestStablecoinsByChain } from '../../../../../core/redux/slices/bridge';
import { useTokensWithBalance } from '../../hooks/useTokensWithBalance';
import { BridgeToken } from '../../types';
import { SUPPORTED_BATCH_SELL_CHAIN_IDS } from './BatchSellTokenSelect.utils';

function removeStablecoinsFromSourceTokens({
  tokens,
  stablecoinsByChain,
}: {
  tokens: BridgeToken[];
  stablecoinsByChain: Partial<Record<CaipChainId, BridgeToken[]>>;
}): BridgeToken[] {
  const stablecoinAssetIdsByChain = new Map(
    Object.entries(stablecoinsByChain).map(([chainId, stablecoins]) => [
      chainId as CaipChainId,
      new Set(
        (stablecoins ?? [])
          .map((stablecoin) =>
            formatAddressToAssetId(stablecoin.address, stablecoin.chainId),
          )
          .filter((assetId): assetId is CaipAssetType => Boolean(assetId)),
      ),
    ]),
  );

  return tokens.filter((token) => {
    const caipChainId = formatChainIdToCaip(token.chainId);
    const stablecoinAssetIds = stablecoinAssetIdsByChain.get(caipChainId);

    if (!stablecoinAssetIds) {
      return true;
    }

    const assetId = formatAddressToAssetId(token.address, token.chainId);

    if (!assetId) {
      return true;
    }

    return !stablecoinAssetIds.has(assetId);
  });
}

export function useBatchSellTokens() {
  const allWalletTokens = useTokensWithBalance({
    chainIds: SUPPORTED_BATCH_SELL_CHAIN_IDS,
  });
  const stablecoinsByChain = useSelector(selectBatchSellDestStablecoinsByChain);

  return useMemo(
    () =>
      removeStablecoinsFromSourceTokens({
        tokens: allWalletTokens,
        stablecoinsByChain,
      }),
    [allWalletTokens, stablecoinsByChain],
  );
}

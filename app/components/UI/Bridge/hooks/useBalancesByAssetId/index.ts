import { useMemo } from 'react';
import {
  assetIdsMatch,
  formatAddressToAssetId,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import { useTokensWithBalance } from '../useTokensWithBalance';
import { CaipAssetType, CaipChainId, Hex } from '@metamask/utils';
import { BridgeToken } from '../../types';
import {
  ARC_NATIVE_ASSET_ID,
  ARC_NATIVE_ASSET_ID_LEGACY,
  ARC_USDC_ASSET_ID,
} from '../../../../hooks/useArcDefaultTokens';

/**
 * Interface for the balance data stored in the lookup map
 */
export interface BalanceData {
  balance: string;
  balanceFiat?: string;
  tokenFiatAmount?: number;
  currencyExchangeRate?: number;
  accountType?: BridgeToken['accountType'];
}

/**
 * Map of assetId (CAIP format) to balance data for O(1) lookup
 * Example: { "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": { balance: "0.0004", ... } }
 */
export type BalancesByAssetId = Record<CaipAssetType, BalanceData>;

/**
 * Builds an asset-id keyed balance lookup for the swap token selector.
 *
 * Arc is a special case: the selector renders ERC-20 USDC, while the held
 * balance may still resolve from the native Arc asset entry. To keep the
 * visible Arc USDC row hydrated, this hook aliases the native Arc balance onto
 * the ERC-20 Arc USDC asset id in addition to the native asset id.
 *
 * @param params - Configuration object containing chainIds.
 * @returns Tokens with balances plus an O(1) asset-id lookup map.
 */
export const useBalancesByAssetId = ({
  chainIds,
}: {
  chainIds: (Hex | CaipChainId)[] | undefined;
}): {
  tokensWithBalance: ReturnType<typeof useTokensWithBalance>;
  balancesByAssetId: BalancesByAssetId;
} => {
  const tokensWithBalance = useTokensWithBalance({ chainIds });

  const balancesByAssetId = useMemo(() => {
    const balancesMap: BalancesByAssetId = {};

    tokensWithBalance.forEach((token) => {
      const assetId = formatAddressToAssetId(token.address, token.chainId);
      if (assetId && token.balance) {
        const balanceData = {
          balance: token.balance,
          balanceFiat: token.balanceFiat,
          tokenFiatAmount: token.tokenFiatAmount,
          currencyExchangeRate: token.currencyExchangeRate,
          accountType: token.accountType,
        };

        // Store the canonical bridge-controller key for checksummed lookups for EVM.
        balancesMap[assetId] = balanceData;

        // Also store the lowercase EVM key
        const normalizedAssetId = isNonEvmChainId(token.chainId)
          ? assetId
          : (assetId.toLowerCase() as CaipAssetType);
        balancesMap[normalizedAssetId] = balanceData;

        // Arc displays ERC-20 USDC in the picker even when the held balance is
        // sourced from the native Arc asset entry. Mirror the native balance to
        // the ERC-20 asset id so the visible row shows the correct balance.
        if (
          assetIdsMatch(assetId, ARC_NATIVE_ASSET_ID) ||
          assetIdsMatch(assetId, ARC_NATIVE_ASSET_ID_LEGACY)
        ) {
          balancesMap[ARC_USDC_ASSET_ID] = balanceData;
          balancesMap[ARC_USDC_ASSET_ID.toLowerCase() as CaipAssetType] =
            balanceData;
        }
      }
    });

    return balancesMap;
  }, [tokensWithBalance]);

  return { tokensWithBalance, balancesByAssetId };
};

import { useMemo } from 'react';
import { CaipChainId, Hex } from '@metamask/utils';
import { isNonEvmChainId } from '@metamask/bridge-controller';
import type { Position } from '@metamask/social-controllers';
import { useSelector } from 'react-redux';
import { useAssetMetadata } from '../../../../../UI/Bridge/hooks/useAssetMetadata';
import { getNativeSourceToken } from '../../../../../UI/Bridge/utils/tokenUtils';
import { chainNameToId } from '../../../utils/chainMapping';
import type { BridgeToken } from '../../../../../UI/Bridge/types';
import { selectCurrencyRateForChainId } from '../../../../../../selectors/currencyRateController';
import { selectAccountBalanceByChainId } from '../../../../../../selectors/accountTrackerController';
import type { RootState } from '../../../../../../reducers';
import { formatUnits } from 'ethers/lib/utils';

// Default source chain: Ethereum mainnet — the bridge system handles cross-chain swaps
const DEFAULT_SOURCE_CHAIN_ID: Hex = '0x1';

export interface QuickBuySetupResult {
  /** The destination chain ID (hex or CAIP) for this position's chain */
  chainId: Hex | CaipChainId | undefined;
  /** The source chain ID (Ethereum mainnet) */
  sourceChainId: Hex;
  /** The destination token (what the user is buying) */
  destToken: BridgeToken | undefined;
  /** The source token (native asset of mainnet, enriched with exchange rate and balance) */
  sourceToken: BridgeToken | undefined;
  /** Whether token metadata is still loading */
  isLoading: boolean;
  /** Whether the chain is unsupported */
  isUnsupportedChain: boolean;
}

/**
 * Resolves a Position from the Social API into BridgeToken objects
 * that can be used by the Bridge/Swaps system.
 *
 * Source token is always ETH on Ethereum mainnet — the Bridge controller
 * handles cross-chain routing (e.g. mainnet ETH → Base ZORA).
 */
export const useQuickBuySetup = (
  position: Position | null,
): QuickBuySetupResult => {
  // Destination chain from the position
  const destChainId = useMemo(
    () => (position ? chainNameToId(position.chain) : undefined),
    [position],
  );

  const isUnsupportedChain = Boolean(position && !destChainId);

  // Source chain is always Ethereum mainnet
  const sourceChainId = DEFAULT_SOURCE_CHAIN_ID;

  // Get the native token's fiat exchange rate for the source chain (mainnet)
  const nativeExchangeRate = useSelector((state: RootState) =>
    selectCurrencyRateForChainId(state, sourceChainId),
  );

  // Get the native balance for the source chain (mainnet)
  const accountBalance = useSelector((state: RootState) =>
    selectAccountBalanceByChainId(state, sourceChainId),
  );

  // Fetch token metadata (decimals, image) from Token Metadata API for the dest token
  const { assetMetadata, pending: isMetadataLoading } = useAssetMetadata(
    position?.tokenAddress ?? '',
    Boolean(position && destChainId),
    destChainId,
  );

  // Build destination token (the token the user wants to buy)
  const destToken = useMemo<BridgeToken | undefined>(() => {
    if (!position || !destChainId) return undefined;

    if (assetMetadata) {
      return {
        address: isNonEvmChainId(destChainId)
          ? assetMetadata.address
          : position.tokenAddress,
        symbol: position.tokenSymbol,
        name: position.tokenName,
        decimals: assetMetadata.decimals,
        image: assetMetadata.image,
        chainId: destChainId,
      };
    }

    return undefined;
  }, [position, destChainId, assetMetadata]);

  // Build source token (native asset of Ethereum mainnet, enriched with exchange rate + balance)
  const sourceToken = useMemo<BridgeToken | undefined>(() => {
    try {
      const baseToken = getNativeSourceToken(sourceChainId);

      // Convert the hex balance (wei) to a human-readable decimal string
      let displayBalance: string | undefined;
      if (accountBalance?.balance) {
        try {
          displayBalance = formatUnits(
            accountBalance.balance,
            baseToken.decimals,
          );
        } catch {
          displayBalance = undefined;
        }
      }

      return {
        ...baseToken,
        currencyExchangeRate: nativeExchangeRate || undefined,
        balance: displayBalance,
      };
    } catch {
      return undefined;
    }
  }, [sourceChainId, nativeExchangeRate, accountBalance]);

  return {
    chainId: destChainId,
    sourceChainId,
    destToken,
    sourceToken,
    isLoading: isMetadataLoading,
    isUnsupportedChain,
  };
};

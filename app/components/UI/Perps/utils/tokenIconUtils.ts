import { safeToChecksumAddress } from '../../../../util/address';
import { isIPFSUri } from '../../../../util/general';
import isUrl from 'is-url';
import type { BridgeToken } from '../../Bridge/types';
import type { TokenListMap } from '@metamask/assets-controllers';
import type { Hex, CaipChainId } from '@metamask/utils';

/**
 * Configuration for token icon enhancement
 */
export interface TokenIconEnhancementConfig {
  token: Partial<BridgeToken>;
  tokenList: TokenListMap;
  isIpfsGatewayEnabled?: boolean;
}

/**
 * Configuration for creating enhanced tokens
 */
export interface CreateEnhancedTokenConfig {
  symbol: string;
  address: string;
  chainId: Hex | CaipChainId;
  decimals: number;
  tokenList: TokenListMap;
  name?: string;
  isIpfsGatewayEnabled?: boolean;
}

/**
 * Enhances a token with proper icon URL following MetaMask's TokenImage patterns
 *
 * Resolution priority (same as TokenImage component):
 * 1. Direct image property (if valid URL and not blocked IPFS)
 * 2. TokenList metadata by exact address match
 * 3. TokenList metadata by lowercase address match
 * 4. Cross-chain fallback for common tokens (USDC, USDT, DAI)
 * 5. Empty string (fallback to Identicon)
 *
 * @param config - Configuration object with token, tokenList, and IPFS settings
 * @returns Enhanced token with proper image URLs
 */
export const enhanceTokenWithIcon = ({
  token,
  tokenList,
  isIpfsGatewayEnabled = false,
}: TokenIconEnhancementConfig): BridgeToken => {
  const tokenAddress = safeToChecksumAddress(token.address || '');

  // Helper function to validate URL and check IPFS restrictions
  const isValidImageUrl = (url: string): boolean => {
    if (!isUrl(url)) return false;

    // Check IPFS restrictions (following TokenImage pattern)
    if (!isIpfsGatewayEnabled && isIPFSUri(url)) {
      return false;
    }

    return true;
  };

  // Primary image resolution following TokenImage priority
  let resolvedImageUrl = '';

  // 1. Check direct image property
  if (token.image && isValidImageUrl(token.image)) {
    resolvedImageUrl = token.image;
  }
  // 2. Check TokenList metadata
  else if (tokenAddress && tokenList) {
    // Try exact address match first
    const exactMatch = tokenList[tokenAddress];
    if (exactMatch?.iconUrl && isValidImageUrl(exactMatch.iconUrl)) {
      resolvedImageUrl = exactMatch.iconUrl;
    } else {
      // Try lowercase address match
      const lowercaseMatch = tokenList[tokenAddress.toLowerCase()];
      if (lowercaseMatch?.iconUrl && isValidImageUrl(lowercaseMatch.iconUrl)) {
        resolvedImageUrl = lowercaseMatch.iconUrl;
      }
    }
  }

  // 3. Cross-chain fallback for common tokens (USDC, USDT, DAI)
  if (!resolvedImageUrl && token.symbol && tokenList) {
    // Search for token by symbol across all chains in the token list
    const tokenSymbol = token.symbol.toUpperCase();

    // Debug logging removed

    // Find any token in the list that matches the symbol
    for (const [, tokenData] of Object.entries(tokenList)) {
      if (tokenData.symbol?.toUpperCase() === tokenSymbol) {
        // Debug logging removed
        if (tokenData.iconUrl && isValidImageUrl(tokenData.iconUrl)) {
          resolvedImageUrl = tokenData.iconUrl;
          // Debug logging removed
          break; // Use the first valid match found
        }
      }
    }

    // Debug logging removed
  }

  // Return enhanced token with all properties
  return {
    // Required properties
    symbol: token.symbol || '',
    address: token.address || '',
    decimals: token.decimals || 18, // Default fallback, but should be provided
    chainId: token.chainId || ('0x1' as Hex), // Default fallback, but should be provided
    // Optional properties
    name: token.name || token.symbol,
    image: resolvedImageUrl,
    // Balance properties
    balance: token.balance,
    balanceFiat: token.balanceFiat,
    tokenFiatAmount: token.tokenFiatAmount,
    currencyExchangeRate: token.currencyExchangeRate,
  };
};

/**
 * Creates a token object with proper icon from basic token information
 * @param config - Configuration object with token details and metadata
 * @returns BridgeToken with proper icon enhancement
 */
export const createEnhancedToken = ({
  symbol,
  address,
  chainId,
  decimals,
  tokenList,
  name,
  isIpfsGatewayEnabled = false,
}: CreateEnhancedTokenConfig): BridgeToken => {
  const baseToken: Partial<BridgeToken> = {
    symbol,
    address,
    chainId,
    decimals,
    name: name || symbol,
  };

  return enhanceTokenWithIcon({
    token: baseToken,
    tokenList,
    isIpfsGatewayEnabled,
  });
};

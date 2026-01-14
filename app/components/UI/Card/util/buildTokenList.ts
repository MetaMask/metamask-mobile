import { CaipChainId } from '@metamask/utils';
import { SolScope } from '@metamask/keyring-api';
import {
  AllowanceState,
  CardTokenAllowance,
  DelegationSettingsResponse,
  CardNetwork,
} from '../types';
import { SUPPORTED_ASSET_NETWORKS } from '../constants';

/** Known stablecoin symbols that should be uppercased */
const KNOWN_UPPERCASE_SYMBOLS = ['USDT', 'USDC', 'DAI', 'WETH', 'WBTC'];

/** Quick-select token symbols for SpendingLimit screen (display casing) */
export const QUICK_SELECT_TOKENS = ['mUSD', 'USDC'] as const;

/** CAIP chain ID for Linea mainnet */
export const LINEA_CAIP_CHAIN_ID = 'eip155:59144' as CaipChainId;

interface SupportedToken {
  address?: string;
  symbol?: string;
  name?: string;
}

interface BuildTokenListParams {
  delegationSettings: DelegationSettingsResponse | null;
  userLocation: 'us' | 'international' | string;
  getSupportedTokensByChainId?: (chainId: CaipChainId) => SupportedToken[];
  hideSolana?: boolean;
}

/**
 * Normalizes a token symbol - uppercases known stablecoins
 */
export function normalizeSymbol(symbol: string): string {
  if (KNOWN_UPPERCASE_SYMBOLS.includes(symbol.toUpperCase())) {
    return symbol.toUpperCase();
  }
  return symbol;
}

/**
 * Converts a network config to CAIP chain ID
 */
export function getCaipChainId(
  network: DelegationSettingsResponse['networks'][0],
): CaipChainId {
  if (network.network === 'solana') {
    return SolScope.Mainnet;
  }
  const chainIdStr = network.chainId;
  const numericChainId = chainIdStr.startsWith('0x')
    ? parseInt(chainIdStr, 16)
    : parseInt(chainIdStr, 10);
  return `eip155:${numericChainId}` as CaipChainId;
}

/**
 * Checks if a network should be processed based on filters
 */
export function shouldProcessNetwork(
  network: DelegationSettingsResponse['networks'][0],
  userLocation: string,
  hideSolana: boolean,
): boolean {
  const networkLower = network.network?.toLowerCase();

  // Filter unsupported networks
  if (
    !networkLower ||
    !SUPPORTED_ASSET_NETWORKS.includes(networkLower as CardNetwork)
  ) {
    return false;
  }

  // Filter Solana if requested
  if (hideSolana && network.network === 'solana') {
    return false;
  }

  // Filter Linea by location
  const isLineaNetwork =
    network.network === 'linea' || network.network === 'linea-us';
  if (isLineaNetwork) {
    return (
      (userLocation === 'us' && network.network === 'linea-us') ||
      (userLocation !== 'us' && network.network === 'linea')
    );
  }

  return true;
}

/**
 * Single source of truth for building token lists from delegation settings.
 * Single source of truth for building token lists, used by AssetSelectionBottomSheet and useSpendingLimitData.
 */
export function buildTokenListFromSettings({
  delegationSettings,
  userLocation,
  getSupportedTokensByChainId,
  hideSolana = true,
}: BuildTokenListParams): CardTokenAllowance[] {
  if (!delegationSettings?.networks) {
    return [];
  }

  const tokens: CardTokenAllowance[] = [];

  for (const network of delegationSettings.networks) {
    if (!shouldProcessNetwork(network, userLocation, hideSolana)) {
      continue;
    }

    const caipChainId = getCaipChainId(network);
    const isNonProduction = network.environment !== 'production';

    for (const [, tokenConfig] of Object.entries(network.tokens || {})) {
      if (!tokenConfig.address) continue;

      // Check for duplicates
      const isDuplicate = tokens.some(
        (t) =>
          t.address?.toLowerCase() === tokenConfig.address.toLowerCase() &&
          t.caipChainId === caipChainId,
      );
      if (isDuplicate) continue;

      // Get metadata from SDK if available
      const sdkTokens = getSupportedTokensByChainId?.(caipChainId) ?? [];
      const sdkToken = sdkTokens.find(
        (t) => t.symbol?.toLowerCase() === tokenConfig.symbol.toLowerCase(),
      );

      // Normalize symbol
      const symbol = normalizeSymbol(sdkToken?.symbol ?? tokenConfig.symbol);

      // Get correct address (SDK address for non-production environments)
      const address =
        isNonProduction && sdkToken?.address
          ? sdkToken.address
          : tokenConfig.address;

      tokens.push({
        address,
        symbol,
        name: sdkToken?.name ?? symbol,
        decimals: tokenConfig.decimals,
        caipChainId,
        walletAddress: undefined,
        allowanceState: AllowanceState.NotEnabled,
        allowance: '0',
        delegationContract: network.delegationContract,
        priority: undefined,
        stagingTokenAddress: isNonProduction ? tokenConfig.address : undefined,
      });
    }
  }

  return tokens;
}

/**
 * Builds quick-select tokens (mUSD, USDC on Linea) from available tokens
 * @param allTokens - User's wallet tokens
 * @param delegationSettings - Delegation settings with supported networks/tokens
 * @param getSupportedTokensByChainId - Optional SDK function to resolve production addresses for icons
 */
export function buildQuickSelectTokens(
  allTokens: CardTokenAllowance[],
  delegationSettings: DelegationSettingsResponse | null,
  getSupportedTokensByChainId?: (chainId: CaipChainId) => SupportedToken[],
): { symbol: string; token: CardTokenAllowance | null }[] {
  // Get tokens from delegation settings for Linea as fallback
  const lineaTokensFromSettings: CardTokenAllowance[] = [];

  if (delegationSettings?.networks) {
    for (const network of delegationSettings.networks) {
      if (network.network !== 'linea' && network.network !== 'linea-us') {
        continue;
      }

      const caipChainId = getCaipChainId(network);
      if (caipChainId !== LINEA_CAIP_CHAIN_ID) continue;

      const isNonProduction = network.environment !== 'production';

      for (const [, tokenConfig] of Object.entries(network.tokens)) {
        if (!tokenConfig.address) continue;

        // For non-production environments, use SDK to get the correct production address for icons
        let resolvedAddress = tokenConfig.address;
        if (isNonProduction && getSupportedTokensByChainId) {
          const chainTokens = getSupportedTokensByChainId(caipChainId);
          const sdkToken = chainTokens.find(
            (t) => t.symbol?.toUpperCase() === tokenConfig.symbol.toUpperCase(),
          );
          if (sdkToken?.address) {
            resolvedAddress = sdkToken.address;
          }
        }

        lineaTokensFromSettings.push({
          address: resolvedAddress,
          symbol: tokenConfig.symbol,
          name: tokenConfig.symbol,
          decimals: tokenConfig.decimals,
          caipChainId: LINEA_CAIP_CHAIN_ID,
          walletAddress: undefined,
          allowanceState: AllowanceState.NotEnabled,
          allowance: '0',
          delegationContract: network.delegationContract,
          stagingTokenAddress: isNonProduction
            ? tokenConfig.address
            : undefined,
        } as CardTokenAllowance);
      }
    }
  }

  // Combine allTokens with delegation settings tokens
  const combinedTokens = [...allTokens, ...lineaTokensFromSettings];

  return QUICK_SELECT_TOKENS.map((symbol) => {
    const token =
      combinedTokens.find(
        (t) =>
          t.symbol?.toUpperCase() === symbol.toUpperCase() &&
          t.caipChainId === LINEA_CAIP_CHAIN_ID,
      ) ?? null;
    // Use the display symbol from QUICK_SELECT_TOKENS for consistent casing
    return { symbol, token };
  });
}

/**
 * Gets valid Linea chain IDs based on user location
 */
export function getValidLineaChainIds(
  delegationSettings: DelegationSettingsResponse | null,
  userLocation: string,
): Set<string> {
  const validIds = new Set<string>();
  if (!delegationSettings?.networks) return validIds;

  for (const network of delegationSettings.networks) {
    const isLineaNetwork =
      network.network === 'linea' || network.network === 'linea-us';
    if (!isLineaNetwork) continue;

    const shouldInclude =
      (userLocation === 'us' && network.network === 'linea-us') ||
      (userLocation !== 'us' && network.network === 'linea');

    if (shouldInclude) {
      const caipChainId = getCaipChainId(network);
      validIds.add(caipChainId);
    }
  }

  return validIds;
}

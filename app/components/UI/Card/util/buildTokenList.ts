import { CaipChainId } from '@metamask/utils';
import { SolScope } from '@metamask/keyring-api';
import {
  FundingStatus,
  CardFundingToken,
  DelegationSettingsResponse,
  CardNetwork,
} from '../types';
import { SUPPORTED_ASSET_NETWORKS } from '../constants';

/** Stablecoin symbols supported by card that the API may return lowercased */
const KNOWN_UPPERCASE_SYMBOLS = ['USDT', 'USDC'];

/** CAIP chain ID for Linea mainnet */
export const LINEA_CAIP_CHAIN_ID = 'eip155:59144' as CaipChainId;

interface SupportedToken {
  address?: string;
  symbol?: string;
  name?: string;
}

interface BuildTokenListParams {
  delegationSettings: DelegationSettingsResponse | null;
  getSupportedTokensByChainId?: (chainId: CaipChainId) => SupportedToken[];
}

function normalizeSymbol(symbol: string): string {
  if (KNOWN_UPPERCASE_SYMBOLS.includes(symbol.toUpperCase())) {
    return symbol.toUpperCase();
  }
  return symbol;
}

function getCaipChainId(
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

function shouldProcessNetwork(
  network: DelegationSettingsResponse['networks'][0],
): boolean {
  const networkLower = network.network?.toLowerCase();

  // Filter unsupported networks
  if (
    !networkLower ||
    !SUPPORTED_ASSET_NETWORKS.includes(networkLower as CardNetwork)
  ) {
    return false;
  }

  return true;
}

/**
 * Single source of truth for building token lists from delegation settings.
 */
export function buildDelegationTokenList({
  delegationSettings,
  getSupportedTokensByChainId,
}: BuildTokenListParams): CardFundingToken[] {
  if (!delegationSettings?.networks) {
    return [];
  }

  const tokens: CardFundingToken[] = [];

  for (const network of delegationSettings.networks) {
    if (!shouldProcessNetwork(network)) {
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
        fundingStatus: FundingStatus.NotEnabled,
        spendableBalance: '0',
        delegationContract: network.delegationContract,
        priority: undefined,
        stagingTokenAddress: isNonProduction ? tokenConfig.address : undefined,
      });
    }
  }

  return tokens;
}

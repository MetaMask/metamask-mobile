import NavigationService from '../../../NavigationService';
import {
  CaipAssetType,
  CaipChainId,
  Hex,
  isCaipAssetType,
  isCaipChainId,
  parseCaipAssetType,
} from '@metamask/utils';
import {
  BridgeToken,
  BridgeViewMode,
} from '../../../../components/UI/Bridge/types';
import Routes from '../../../../constants/navigation/Routes';
import { BridgeRouteParams } from '../../../../components/UI/Bridge/Views/BridgeView';
import { fetchAssetMetadata } from '../../../../components/UI/Bridge/hooks/useAssetMetadata/utils';
import { isNonEvmChainId } from '@metamask/bridge-controller';
import { ethers } from 'ethers';
import Engine from '../../../Engine';
import { isHex } from 'viem';

interface HandleSwapUrlParams {
  swapPath: string;
}

/**
 * Validates and looks up a token from the bridge token list
 */
const validateAndLookupToken = async (
  caipAssetType: CaipAssetType,
): Promise<BridgeToken | null> => {
  try {
    const parsedCaipAssetType = parseCaipAssetType(caipAssetType);

    const matchingToken = await fetchAssetMetadata(
      caipAssetType,
      parsedCaipAssetType.chainId,
    );

    if (!matchingToken) return null;

    // Create the token with metadata (balance will be fetched by Bridge view)
    const token: BridgeToken = {
      address: isNonEvmChainId(matchingToken.chainId)
        ? matchingToken.assetId
        : matchingToken.address,
      symbol: matchingToken.symbol,
      name: matchingToken.name,
      decimals: matchingToken.decimals,
      image: matchingToken.image || '',
      chainId: matchingToken.chainId,
    };

    return token;
  } catch (error) {
    // Token validation failed - return null to indicate unsupported token
    return null;
  }
};

const isChainAvailable = (chainId: Hex | CaipChainId) => {
  if (isHex(chainId)) {
    return Boolean(
      Engine.context.NetworkController.getNetworkConfigurationByChainId(
        chainId,
      ),
    );
  } else if (isCaipChainId(chainId)) {
    return Boolean(
      Engine.context.MultichainNetworkController.state
        .multichainNetworkConfigurationsByChainId[chainId],
    );
  }

  return false;
};

/**
 * Handles deeplinks for the unified swap/bridge experience
 *
 * @param params Object containing the swap path
 * @param params.swapPath - The swap URL path containing the parameters
 *
 * @example
 * URL format: ?from=eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&to=eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174&amount=1000000
 *
 * Parameters:
 * - from: CAIP-19 asset identifier for source token
 * - to: CAIP-19 asset identifier for destination token
 * - amount: Amount in minimal divisible units (e.g., 1000000 for 1.00 USDC)
 *
 * All parameters are optional, allows partial deep linking
 */
export const handleSwapUrl = async ({ swapPath }: HandleSwapUrlParams) => {
  try {
    // Parse URL parameters
    const cleanPath = swapPath.startsWith('?') ? swapPath.slice(1) : swapPath;
    const urlParams = new URLSearchParams(cleanPath);

    const fromCaip = urlParams.get('from');
    const toCaip = urlParams.get('to');
    const atomicAmount = urlParams.get('amount');

    // Validate and lookup tokens
    const sourceToken =
      fromCaip && isCaipAssetType(fromCaip)
        ? await validateAndLookupToken(fromCaip)
        : undefined;

    // Check if user has added the source chain to their wallet
    if (sourceToken?.chainId && !isChainAvailable(sourceToken?.chainId)) {
      throw new Error('Chain not available');
    }

    const destToken =
      toCaip && isCaipAssetType(toCaip)
        ? await validateAndLookupToken(toCaip)
        : undefined;

    // Process amount
    const sourceAmount =
      atomicAmount && sourceToken?.decimals !== undefined
        ? ethers.utils.formatUnits(atomicAmount, sourceToken.decimals)
        : undefined;

    // Navigate to bridge view with deep link parameters
    const params: BridgeRouteParams = {
      sourceToken: sourceToken ?? undefined,
      destToken: destToken ?? undefined,
      sourceAmount: sourceAmount ?? undefined,
      sourcePage: 'deeplink',
      bridgeViewMode: BridgeViewMode.Unified,
    };
    NavigationService.navigation.navigate(Routes.BRIDGE.ROOT, {
      screen: Routes.BRIDGE.BRIDGE_VIEW,
      params,
    });
  } catch (error) {
    // Deep link processing failed - fallback to bridge view without parameters
    // This ensures the deep link never breaks the user experience
    const params: BridgeRouteParams = {
      sourcePage: 'deeplink',
      bridgeViewMode: BridgeViewMode.Unified,
    };
    NavigationService.navigation.navigate(Routes.BRIDGE.ROOT, {
      screen: Routes.BRIDGE.BRIDGE_VIEW,
      params,
    });
  }
};

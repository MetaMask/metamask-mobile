import NavigationService from '../../../NavigationService';
import {
  CaipAssetType,
  CaipChainId,
  Hex,
  isCaipAssetType,
  isCaipChainId,
  parseCaipAssetType,
} from '@metamask/utils';
import { RpcEndpointType } from '@metamask/network-controller';
import {
  BridgeToken,
  BridgeViewMode,
} from '../../../../components/UI/Bridge/types';
import Routes from '../../../../constants/navigation/Routes';
import { BridgeRouteParams } from '../../../../components/UI/Bridge/hooks/useSwapBridgeNavigation';
import { fetchAssetMetadata } from '../../../../components/UI/Bridge/hooks/useAssetMetadata/utils';
import {
  ALLOWED_BRIDGE_CHAIN_IDS,
  isNonEvmChainId,
  MetaMetricsSwapsEventSource,
} from '@metamask/bridge-controller';
import { ethers } from 'ethers';
import Engine from '../../../Engine';
import { isHex } from 'viem';
import { PopularList } from '../../../../util/networks/customNetworks';
import {
  clearSuppressedNetworkAddedToast,
  suppressNextNetworkAddedToast,
} from '../../../../util/networks/networkToastSuppression';

import { HandleSwapUrlParams } from '../../types/deepLink.types';

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

const isSwapSupportedChain = (chainId: Hex | CaipChainId) =>
  (
    ALLOWED_BRIDGE_CHAIN_IDS as readonly (Hex | CaipChainId | string)[]
  ).includes(chainId);

const enableChainInBackground = async (chainId: Hex | CaipChainId) => {
  try {
    await Engine.context.NetworkEnablementController?.enableNetwork?.(chainId);
  } catch {
    // Best-effort only. Chain availability is re-checked independently.
  }
};

const addEvmNetworkFromPopularList = async (chainId: Hex) => {
  const popularNetwork = PopularList.find(
    (network) => network.chainId === chainId,
  );

  if (!popularNetwork) {
    return;
  }

  const { blockExplorerUrl } = popularNetwork.rpcPrefs ?? {};

  suppressNextNetworkAddedToast(chainId);

  try {
    await Engine.context.NetworkController.addNetwork({
      chainId,
      blockExplorerUrls: blockExplorerUrl ? [blockExplorerUrl] : [],
      defaultRpcEndpointIndex: 0,
      defaultBlockExplorerUrlIndex: blockExplorerUrl ? 0 : undefined,
      name: popularNetwork.nickname,
      nativeCurrency: popularNetwork.ticker,
      rpcEndpoints: [
        {
          url: popularNetwork.rpcUrl,
          failoverUrls: popularNetwork.failoverRpcUrls,
          name: popularNetwork.nickname,
          type: RpcEndpointType.Custom,
        },
      ],
    });
  } catch (error) {
    clearSuppressedNetworkAddedToast(chainId);
    throw error;
  }
};

const ensureChainAvailable = async (chainId: Hex | CaipChainId) => {
  if (!isSwapSupportedChain(chainId)) {
    return false;
  }

  if (isChainAvailable(chainId)) {
    await enableChainInBackground(chainId);
    return true;
  }

  if (isCaipChainId(chainId)) {
    await enableChainInBackground(chainId);
    return isChainAvailable(chainId);
  }

  try {
    await addEvmNetworkFromPopularList(chainId);
  } catch {
    // Continue and re-check availability in case another flow added it first.
  }

  if (!isChainAvailable(chainId)) {
    return false;
  }

  await enableChainInBackground(chainId);
  return true;
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

    // Ensure supported source chains exist and are enabled before the Bridge
    // view tries to switch into them on mount.
    if (
      sourceToken?.chainId &&
      !(await ensureChainAvailable(sourceToken.chainId))
    ) {
      throw new Error('Chain not available');
    }

    const destTokenCandidate =
      toCaip && isCaipAssetType(toCaip)
        ? await validateAndLookupToken(toCaip)
        : undefined;

    const destToken =
      destTokenCandidate?.chainId &&
      !(await ensureChainAvailable(destTokenCandidate.chainId))
        ? undefined
        : destTokenCandidate;

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
      location: MetaMetricsSwapsEventSource.MainView,
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
      location: MetaMetricsSwapsEventSource.MainView,
    };
    NavigationService.navigation.navigate(Routes.BRIDGE.ROOT, {
      screen: Routes.BRIDGE.BRIDGE_VIEW,
      params,
    });
  }
};

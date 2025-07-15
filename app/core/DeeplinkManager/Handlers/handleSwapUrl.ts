import NavigationService from '../../NavigationService';
import { isCaipAssetType, Hex, parseCaipAssetType } from '@metamask/utils';
import { createTokenFromCaip } from '../../../components/UI/Bridge/utils/tokenUtils';
import { fetchBridgeTokens, BridgeClientId } from '@metamask/bridge-controller';
import { handleFetch } from '@metamask/controller-utils';
import { BRIDGE_API_BASE_URL } from '../../../constants/bridge';
import { BridgeToken } from '../../../components/UI/Bridge/types';
import Engine from '../../Engine';
import { PopularList } from '../../../util/networks/customNetworks';
import { RpcEndpointType } from '@metamask/network-controller';

interface HandleSwapUrlParams {
  swapPath: string;
}

/**
 * Validates and looks up a token from the bridge token list
 * @param caipAssetType - The CAIP-19 formatted asset type string
 * @returns Complete BridgeToken object or null if not found/supported
 */
const validateAndLookupToken = async (
  caipAssetType: string,
): Promise<BridgeToken | null> => {
  try {
    // 1. Create basic token from CAIP
    const basicToken = createTokenFromCaip(caipAssetType);
    if (!basicToken) return null;

    // 2. Look up in bridge token list
    const bridgeTokens = await fetchBridgeTokens(
      basicToken.chainId,
      BridgeClientId.MOBILE,
      handleFetch,
      BRIDGE_API_BASE_URL,
    );

    // 3. For Solana tokens, extract assetReference for lookup
    // but preserve the full CAIP format for the final token
    let lookupAddress = basicToken.address;
    if (
      basicToken.chainId.startsWith('solana:') &&
      isCaipAssetType(caipAssetType)
    ) {
      const parsedAsset = parseCaipAssetType(caipAssetType);
      lookupAddress = parsedAsset.assetReference;
    }

    // 4. Find matching token using the appropriate lookup address
    const matchingToken =
      bridgeTokens[lookupAddress] || bridgeTokens[lookupAddress.toLowerCase()];

    // 5. Return complete token or null if not found
    if (matchingToken) {
      return {
        address: basicToken.address,
        symbol: matchingToken.symbol,
        name: matchingToken.name,
        decimals: matchingToken.decimals,
        image: matchingToken.iconUrl || matchingToken.icon || '',
        chainId: basicToken.chainId,
      };
    }

    return null; // Token not supported in bridge
  } catch (error) {
    console.warn('Error validating token from bridge list:', error);
    return null;
  }
};

/**
 * Checks if a string represents a valid decimal number (digits only)
 * @param value - The string to validate
 * @returns true if the string contains only digits, false otherwise
 */
const isDecimalString = (value: string): boolean => /^\d+$/.test(value);

/**
 * Processes amount parameter from deep link
 * @param amount - Raw amount string (decimal or hex)
 * @param tokenDecimals - Number of decimals for the token
 * @returns Processed amount string or undefined if invalid
 */
const processAmount = (
  amount: string,
  tokenDecimals: number,
): string | undefined => {
  try {
    let minimalUnitsAmount: string;

    // Only accept decimal string format (digits only)
    if (isDecimalString(amount)) {
      minimalUnitsAmount = amount;
    } else {
      console.warn('Invalid deep link amount format:', amount);
      return undefined;
    }

    // Convert from minimal divisible units to display units
    const minimalUnits = parseFloat(minimalUnitsAmount);
    const divisor = Math.pow(10, tokenDecimals);
    const displayAmount = (minimalUnits / divisor).toString();

    // Simple validation - ensure it's a positive number
    if (parseFloat(displayAmount) > 0) {
      return displayAmount;
    }

    return undefined;
  } catch (error) {
    console.warn('Error processing deep link amount:', amount, error);
    return undefined;
  }
};

/**
 * Handles deeplinks for the unified swap/bridge experience
 * Expected format: https://metamask.app.link/swap?from=0x...&to=0x...&amount=1
 *
 * @param params Object containing the swap path and navigation object
 * @param params.swapPath - The swap URL path containing the parameters
 *
 * @example
 * URL format:
 * ?from=eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&to=eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174&amount=1000000
 *
 * Parameters:
 * - from: CAIP-19 asset identifier for source token
 * - to: CAIP-19 asset identifier for destination token
 * - amount: Amount in minimal divisible units (e.g., 1000000 for 1.00 USDC)
 *
 * Note: All parameters are optional, allows partial deep linking
 *
 * This will navigate to the unified Bridge view and pre-fill the form with the provided parameters.
 */
export const handleSwapUrl = async ({ swapPath }: HandleSwapUrlParams) => {
  try {
    const cleanPath = swapPath.startsWith('?') ? swapPath.slice(1) : swapPath;
    const urlParams = new URLSearchParams(cleanPath);

    const fromCaip = urlParams.get('from');
    const toCaip = urlParams.get('to');
    const amount = urlParams.get('amount');

    // Process CAIP parameters to validated tokens from bridge list
    const sourceToken =
      fromCaip && isCaipAssetType(fromCaip)
        ? await validateAndLookupToken(fromCaip)
        : undefined;

    const destToken =
      toCaip && isCaipAssetType(toCaip)
        ? await validateAndLookupToken(toCaip)
        : undefined;

    // Process amount if we have a source token and amount
    const sourceAmount =
      amount && sourceToken?.decimals !== undefined
        ? processAmount(amount, sourceToken.decimals)
        : undefined;

    // Switch to the source token's network if we have a valid source token
    if (sourceToken?.chainId) {
      try {
        const { NetworkController, MultichainNetworkController } =
          Engine.context;

        // Check if we have the network configuration
        let networkConfiguration =
          NetworkController.getNetworkConfigurationByChainId(
            sourceToken.chainId as Hex,
          );

        // If network doesn't exist, try to add it from popular networks
        if (!networkConfiguration) {
          const popularNetwork = PopularList.find(
            (network) => network.chainId === sourceToken.chainId,
          );

          if (popularNetwork) {
            await NetworkController.addNetwork({
              chainId: popularNetwork.chainId as Hex,
              rpcEndpoints: [
                {
                  url: popularNetwork.rpcUrl,
                  name: popularNetwork.nickname,
                  type: RpcEndpointType.Custom,
                },
              ],
              defaultRpcEndpointIndex: 0,
              name: popularNetwork.nickname,
              nativeCurrency: popularNetwork.ticker,
              blockExplorerUrls: popularNetwork.rpcPrefs?.blockExplorerUrl
                ? [popularNetwork.rpcPrefs.blockExplorerUrl]
                : [],
            });

            // Get the updated network configuration
            networkConfiguration =
              NetworkController.getNetworkConfigurationByChainId(
                sourceToken.chainId as Hex,
              );
          }
        }

        // Switch to the network if we have a valid configuration
        if (networkConfiguration) {
          const { rpcEndpoints, defaultRpcEndpointIndex } =
            networkConfiguration;
          const { networkClientId } = rpcEndpoints[defaultRpcEndpointIndex];

          await MultichainNetworkController.setActiveNetwork(networkClientId);
        }
      } catch (error) {
        console.warn('Error switching network for deep link:', error);
        // Continue with navigation even if network switch fails
      }
    }

    // Navigate with route params - let component handle the Redux updates
    NavigationService.navigation.navigate('Bridge', {
      screen: 'BridgeView',
      params: {
        sourcePage: 'deeplink',
        sourceToken,
        destToken,
        sourceAmount,
      },
    });
  } catch (error) {
    // Fallback to bridge view without parameters on any error
    NavigationService.navigation.navigate('Bridge', {
      screen: 'BridgeView',
      params: {
        sourcePage: 'deeplink',
      },
    });
  }
};

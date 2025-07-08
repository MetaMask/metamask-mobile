import {
  isCaipAssetType,
  isHexString,
  parseCaipAssetType,
} from '@metamask/utils';
import NavigationService from '../../../core/NavigationService';

interface HandleSwapUrlParams {
  swapPath: string;
}

/**
 * Handles deeplinks for swaps
 * Expected format: https://metamask.app.link/swap?from=0x...&to=0x...&value=1
 *
 * @param params Object containing the swap path and navigation object
 * @param params.swapPath - The swap URL path containing the parameters
 *
 * @example
 * URL format:
 * ?from=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
 * &to=eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7
 * &value=0x38d7ea4c68000
 *
 * Where:
 * - from: CAIP-19 format for source token
 * - to: CAIP-19 format for destination token
 * - value: Hexadecimal amount (e.g., "0x38d7ea4c68000")
 */
export const handleSwapUrl = ({ swapPath }: HandleSwapUrlParams) => {
  try {
    const cleanPath = swapPath.startsWith('?') ? swapPath.slice(1) : swapPath;
    const urlParams = new URLSearchParams(cleanPath);

    const fromCaip = urlParams.get('from');
    const toCaip = urlParams.get('to');
    const amount = urlParams.get('value');

    if (!isCaipAssetType(fromCaip) || !isCaipAssetType(toCaip)) {
      NavigationService.navigation.navigate('Swaps', {
        screen: 'SwapsAmountView',
      });
      return;
    }

    if (!fromCaip || !toCaip) {
      NavigationService.navigation.navigate('Swaps', {
        screen: 'SwapsAmountView',
      });
      return;
    }

    // Extract token addresses from CAIP-19 format
    const fromAddress = parseCaipAssetType(fromCaip).assetReference;
    const toAddress = parseCaipAssetType(toCaip).assetReference;

    if (!fromAddress || !toAddress) {
      NavigationService.navigation.navigate('Swaps', {
        screen: 'SwapsAmountView',
      });
      return;
    }

    NavigationService.navigation.navigate('Swaps', {
      screen: 'SwapsAmountView',
      params: {
        sourceToken: fromAddress,
        destinationToken: toAddress,
        amount: amount && isHexString(amount) ? amount : '0',
      },
    });
  } catch (_) {
    NavigationService.navigation.navigate('Swaps', {
      screen: 'SwapsAmountView',
    });
  }
};

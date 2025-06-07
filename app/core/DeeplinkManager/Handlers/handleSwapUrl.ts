import { NavigationProp, ParamListBase } from '@react-navigation/native';
import {
  isCaipAssetType,
  isHexString,
  parseCaipAssetType,
} from '@metamask/utils';

interface HandleSwapUrlParams {
  swapPath: string;
  navigation: NavigationProp<ParamListBase>;
}

/**
 * Handles deeplinks for swaps
 * Expected format: https://metamask.app.link/swap?fromToken=0x...&toToken=0x...&value=1
 *
 * @param params Object containing the swap path and navigation object
 * @param params.swapPath - The swap URL path containing the parameters
 * @param params.navigation - The navigation object
 *
 * @example
 * URL format:
 * ?fromToken=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
 * &toToken=eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7
 * &value=0x38d7ea4c68000
 *
 * Where:
 * - fromToken: CAIP-19 format for source token
 * - toToken: CAIP-19 format for destination token
 * - value: Hexadecimal amount (e.g., "0x38d7ea4c68000")
 */
export const handleSwapUrl = ({
  swapPath,
  navigation,
}: HandleSwapUrlParams) => {
  try {
    const cleanPath = swapPath.startsWith('?') ? swapPath.slice(1) : swapPath;
    const urlParams = new URLSearchParams(cleanPath);

    const fromTokenCaip = urlParams.get('fromToken');
    const toTokenCaip = urlParams.get('toToken');
    const amount = urlParams.get('value');

    if (!isCaipAssetType(fromTokenCaip) || !isCaipAssetType(toTokenCaip)) {
      navigation.navigate('Swaps', {
        screen: 'SwapsAmountView',
      });
      return;
    }

    if (!fromTokenCaip || !toTokenCaip) {
      navigation.navigate('Swaps', {
        screen: 'SwapsAmountView',
      });
      return;
    }

    // Extract token addresses from CAIP-19 format
    const fromTokenAddress = parseCaipAssetType(fromTokenCaip).assetReference;
    const toTokenAddress = parseCaipAssetType(toTokenCaip).assetReference;

    if (!fromTokenAddress || !toTokenAddress) {
      navigation.navigate('Swaps', {
        screen: 'SwapsAmountView',
      });
      return;
    }

    navigation.navigate('Swaps', {
      screen: 'SwapsAmountView',
      params: {
        sourceToken: fromTokenAddress,
        destinationToken: toTokenAddress,
        amount: amount && isHexString(amount) ? amount : '0',
      },
    });
  } catch (_) {
    navigation.navigate('Swaps', {
      screen: 'SwapsAmountView',
    });
  }
};

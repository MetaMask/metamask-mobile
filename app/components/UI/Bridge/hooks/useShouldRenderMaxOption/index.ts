import { useSelector } from 'react-redux';
import { selectGasIncludedQuoteParams } from '../../../../../selectors/bridge';
import { BridgeToken } from '../../types';
import { useTokenAddress } from '../useTokenAddress';
import { isNativeAddress } from '@metamask/bridge-controller';
import { BigNumber } from 'bignumber.js';

export const useShouldRenderMaxOption = (
  token?: BridgeToken,
  displayBalance?: string,
  _isQuoteSponsored = false,
) => {
  const { gasIncluded, gasIncluded7702 } = useSelector(
    selectGasIncludedQuoteParams,
  );
  const tokenAddress = useTokenAddress(token);
  const isNativeAsset = isNativeAddress(tokenAddress);
  const isZeroDisplayBalance = new BigNumber(displayBalance || 0).eq(0);

  // Do not render on zero balance or undefined token
  if (isZeroDisplayBalance || !token) {
    return false;
  }

  // Always show for non-native tokens
  if (!isNativeAsset) {
    return true;
  }

  return gasIncluded || gasIncluded7702;
};

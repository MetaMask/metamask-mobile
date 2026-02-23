import { useSelector } from 'react-redux';
import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import { RootState } from '../../../../../reducers';
import { selectIsGaslessSwapEnabled } from '../../../../../core/redux/slices/bridge';
import { BridgeToken } from '../../types';
import { useTokenAddress } from '../useTokenAddress';
import {
  formatChainIdToHex,
  isNativeAddress,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import { BigNumber } from 'bignumber.js';

export const useShouldRenderMaxOption = (
  token?: BridgeToken,
  displayBalance?: string,
  isQuoteSponsored = false,
) => {
  const isGaslessSwapEnabled = useSelector((state: RootState) =>
    token?.chainId ? selectIsGaslessSwapEnabled(state, token.chainId) : false,
  );
  const stxEnabled = useSelector((state: RootState) =>
    token?.chainId && !isNonEvmChainId(token.chainId)
      ? selectShouldUseSmartTransaction(
          state,
          formatChainIdToHex(token.chainId),
        )
      : false,
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

  // Show for EVM native tokens if gasless swap is enabled OR quote is sponsored
  // while smart transactions is enabled.
  // For non-EVM native tokens stxEnabled will be false evaluating the whole
  // expression to false. We do not know the fees beforehand so we cannot
  // max out the input amount.
  return (isGaslessSwapEnabled || isQuoteSponsored) && stxEnabled;
};

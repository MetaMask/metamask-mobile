import { useSelector } from 'react-redux';
import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import { RootState } from '../../../../../reducers';
import { selectIsGaslessSwapEnabled } from '../../../../../core/redux/slices/bridge';
import { BridgeToken } from '../../types';
import { useTokenAddress } from '../useTokenAddress';
import { isNativeAddress } from '@metamask/bridge-controller';
import { BigNumber } from 'bignumber.js';
import { isCaipChainId, parseCaipChainId, Hex } from '@metamask/utils';

const caipChainIdToHex = (chainId: string): Hex => {
  if (!isCaipChainId(chainId)) {
    return chainId as Hex;
  }
  const { namespace, reference } = parseCaipChainId(chainId);
  return namespace === 'eip155'
    ? (`0x${Number(reference).toString(16)}` as Hex)
    : (chainId as Hex);
};

export const useShouldRenderMaxOption = (
  token?: BridgeToken,
  displayBalance?: string,
  isQuoteSponsored = false,
) => {
  const isGaslessSwapEnabled = useSelector((state: RootState) =>
    token?.chainId ? selectIsGaslessSwapEnabled(state, token.chainId) : false,
  );
  const stxEnabled = useSelector((state: RootState) =>
    token?.chainId
      ? selectShouldUseSmartTransaction(state, caipChainIdToHex(token.chainId))
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

  // Show for native tokens if gasless swap is enabled OR quote is sponsored
  // while smart transactions is enabled.
  return (isGaslessSwapEnabled || isQuoteSponsored) && stxEnabled;
};

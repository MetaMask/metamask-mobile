import {
  formatChainIdToCaip,
  formatChainIdToHex,
  isSolanaChainId,
} from '@metamask/bridge-controller';
import { useLatestBalance } from '../useLatestBalance';
import { ethers } from 'ethers';
import { CaipChainId, Hex } from '@metamask/utils';
import { useBridgeQuoteData } from '../useBridgeQuoteData';
import { getNativeSourceToken } from '../useInitialSourceToken';

interface Props {
  quote: ReturnType<typeof useBridgeQuoteData>['activeQuote'];
}

/**
 * @returns null if the gas token balance is not available, true if the gas token balance is sufficient, false if the gas token balance is insufficient
 */
export const useHasSufficientGas = ({ quote }: Props): boolean | null => {
  const gasIncluded = quote?.quote.gasIncluded;

  const sourceChainId = quote?.quote.srcChainId;

  let hexOrCaipChainId: CaipChainId | Hex | undefined;
  if (sourceChainId && !gasIncluded) {
    if (isSolanaChainId(sourceChainId)) {
      hexOrCaipChainId = formatChainIdToCaip(sourceChainId);
    } else {
      hexOrCaipChainId = formatChainIdToHex(sourceChainId);
    }
  }
  const sourceChainNativeAsset =
    hexOrCaipChainId && !gasIncluded
      ? getNativeSourceToken(hexOrCaipChainId)
      : undefined;

  const gasTokenBalance = useLatestBalance({
    address: sourceChainNativeAsset?.address,
    chainId: hexOrCaipChainId,
    decimals: sourceChainNativeAsset?.decimals,
  });

  const atomicGasFee =
    quote?.gasFee.effective && !gasIncluded
      ? ethers.utils.parseUnits(
          quote.gasFee.effective.amount,
          sourceChainNativeAsset?.decimals,
        )
      : null;

  if (gasIncluded) {
    return true;
  }

  return gasTokenBalance?.atomicBalance && atomicGasFee
    ? gasTokenBalance.atomicBalance.gte(atomicGasFee)
    : null;
};

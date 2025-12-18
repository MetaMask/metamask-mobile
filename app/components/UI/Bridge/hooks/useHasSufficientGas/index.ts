import {
  formatChainIdToCaip,
  formatChainIdToHex,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import { useLatestBalance } from '../useLatestBalance';
import { ethers } from 'ethers';
import { CaipChainId, Hex } from '@metamask/utils';
import { useBridgeQuoteData } from '../useBridgeQuoteData';
import { getNativeSourceToken } from '../../utils/tokenUtils';
import { BigNumber } from 'bignumber.js';
import { isNumberValue } from '../../../../../util/number';

interface Props {
  quote: ReturnType<typeof useBridgeQuoteData>['activeQuote'];
}

/**
 * @returns null if the gas token balance is not available, true if the gas token balance is sufficient, false if the gas token balance is insufficient
 */
export const useHasSufficientGas = ({ quote }: Props): boolean | null => {
  const gasIncluded = quote?.quote.gasIncluded;
  const gasSponsored = quote?.quote?.gasSponsored;
  const gasIncluded7702 = quote?.quote.gasIncluded7702;
  const isGasless = gasIncluded7702 || gasIncluded;

  const sourceChainId = quote?.quote.srcChainId;

  let hexOrCaipChainId: CaipChainId | Hex | undefined;
  if (sourceChainId && !isGasless && !gasSponsored) {
    if (isNonEvmChainId(sourceChainId)) {
      hexOrCaipChainId = formatChainIdToCaip(sourceChainId);
    } else {
      hexOrCaipChainId = formatChainIdToHex(sourceChainId);
    }
  }
  const sourceChainNativeAsset =
    hexOrCaipChainId && !isGasless && !gasSponsored
      ? getNativeSourceToken(hexOrCaipChainId)
      : undefined;

  const gasTokenBalance = useLatestBalance({
    address: sourceChainNativeAsset?.address,
    chainId: hexOrCaipChainId,
    decimals: sourceChainNativeAsset?.decimals,
  });

  if (isGasless || gasSponsored) {
    return true;
  }

  // quote.gasFee.effective.amount might be in scientific notation (e.g. 9.200359292e-8), so we need to handle that
  const gasAmount = quote?.gasFee?.effective?.amount;
  const effectiveGasFee =
    isNumberValue(gasAmount) && gasAmount != null
      ? new BigNumber(gasAmount).toFixed()
      : null;

  const atomicGasFee =
    effectiveGasFee && !isGasless
      ? ethers.utils.parseUnits(
          effectiveGasFee,
          sourceChainNativeAsset?.decimals,
        )
      : null;

  return gasTokenBalance?.atomicBalance && atomicGasFee
    ? gasTokenBalance.atomicBalance.gte(atomicGasFee)
    : null;
};

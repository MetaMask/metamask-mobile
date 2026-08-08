import {
  formatChainIdToCaip,
  formatChainIdToHex,
  isBitcoinChainId,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import { useLatestBalance } from '../useLatestBalance';
import { ethers } from 'ethers';
import { CaipChainId, Hex } from '@metamask/utils';
import { useBridgeQuoteData } from '../useBridgeQuoteData';
import { getNativeSourceToken } from '../../utils/tokenUtils';
import { BigNumber } from 'bignumber.js';
import { isNumberValue } from '../../../../../util/number/bigint';

interface Props {
  quote: ReturnType<typeof useBridgeQuoteData>['activeQuote'];
}

/**
 * @returns null if the gas token balance is not available, true if the gas token balance is sufficient, false if the gas token balance is insufficient
 * NOTE: THIS IS FOR GASLESS COUNTER METRICS PURPOSES ONLY. It intentionally calculates balance insufficiency irrespective of gasless or sponsored quotes.
 * This is intentionally the same calculation logic as useHasSufficientGas, but disentangled from the gasless or sponsored logic.
 * Separating the logic inside of useHasSufficientGas would also work and would cleaner but is too risky just for the sake of gasless counter metrics.
 */
export const useHasSufficientGasEvenIfGasIncludedOrSponsored = ({
  quote,
}: Props): boolean | null => {
  const sourceChainId = quote?.quote.srcChainId;

  let hexOrCaipChainId: CaipChainId | Hex | undefined;
  if (sourceChainId) {
    if (isNonEvmChainId(sourceChainId)) {
      hexOrCaipChainId = formatChainIdToCaip(sourceChainId);
    } else {
      hexOrCaipChainId = formatChainIdToHex(sourceChainId);
    }
  }
  const sourceChainNativeAsset = hexOrCaipChainId
    ? getNativeSourceToken(hexOrCaipChainId)
    : undefined;

  const gasTokenBalance = useLatestBalance({
    address: sourceChainNativeAsset?.address,
    chainId: hexOrCaipChainId,
    decimals: sourceChainNativeAsset?.decimals,
  });

  // quote.gasFee.total.amount might be in scientific notation (e.g. 9.200359292e-8), so we need to handle that
  const gasAmount =
    sourceChainId && isBitcoinChainId(sourceChainId)
      ? (quote?.totalNetworkFee?.amount ?? quote?.gasFee?.total?.amount)
      : quote?.gasFee?.total?.amount;
  const effectiveGasFee =
    isNumberValue(gasAmount) && gasAmount != null
      ? new BigNumber(gasAmount).toFixed()
      : null;

  const atomicGasFee = effectiveGasFee
    ? ethers.utils.parseUnits(effectiveGasFee, sourceChainNativeAsset?.decimals)
    : null;

  return gasTokenBalance?.atomicBalance && atomicGasFee
    ? gasTokenBalance.atomicBalance.gte(atomicGasFee)
    : null;
};

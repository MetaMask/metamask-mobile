import {
  formatChainIdToCaip,
  formatChainIdToHex,
  isNonEvmChainId,
  isNativeAddress,
  QuoteResponse,
  sumAmounts,
} from '@metamask/bridge-controller';
import { useLatestBalance } from '../useLatestBalance';
import { ethers } from 'ethers';
import { CaipChainId, Hex } from '@metamask/utils';
import { getNativeSourceToken } from '../../utils/tokenUtils';
import { BigNumber } from 'bignumber.js';
import { isNumberValue } from '../../../../../util/number/bigint';

interface Props {
  additionalGasFeeInHex?: Hex;
  quote?: QuoteResponse | null;
}

const getHexOrCaipChainId = (
  chainId?: QuoteResponse['chainId'],
): CaipChainId | Hex | undefined => {
  if (!chainId) {
    return undefined;
  }
  return isNonEvmChainId(chainId)
    ? formatChainIdToCaip(chainId)
    : formatChainIdToHex(chainId);
};

/**
 * @returns null if the gas token balance is not available, true if the gas token balance is sufficient, false if the gas token balance is insufficient
 */
export const useHasSufficientGas = ({
  additionalGasFeeInHex,
  quote,
}: Props): boolean | null => {
  const isGasless =
    quote?.quote?.gasIncluded7702 ||
    quote?.quote?.gasIncluded ||
    quote?.quote?.gasSponsored;
  const shouldCheckQuoteGas = !isGasless;
  const shouldCheckGas = shouldCheckQuoteGas || Boolean(additionalGasFeeInHex);

  const hexOrCaipChainId = shouldCheckGas
    ? getHexOrCaipChainId(quote?.chainId)
    : undefined;
  const sourceChainNativeAsset = hexOrCaipChainId
    ? getNativeSourceToken(hexOrCaipChainId)
    : undefined;

  const gasTokenBalance = useLatestBalance({
    address: sourceChainNativeAsset?.address,
    chainId: hexOrCaipChainId,
    decimals: sourceChainNativeAsset?.decimals,
  });

  if (!shouldCheckGas) {
    return true;
  }

  const gasAmount = sumAmounts(
    quote?.quote?.feeData?.network,
    quote?.quote?.feeData?.relayer,
    quote?.quote?.src?.asset && !isNativeAddress(quote.quote.src.asset.assetId)
      ? quote.quote.feeData.reserve
      : undefined,
  )?.normalizedAmount;
  const effectiveGasFee =
    isNumberValue(gasAmount) && gasAmount != null
      ? new BigNumber(gasAmount).toFixed()
      : null;

  const atomicQuoteGasFee =
    effectiveGasFee && shouldCheckQuoteGas
      ? ethers.utils.parseUnits(
          effectiveGasFee,
          sourceChainNativeAsset?.decimals,
        )
      : null;

  if (
    !gasTokenBalance?.atomicBalance ||
    (shouldCheckQuoteGas && !atomicQuoteGasFee)
  ) {
    return null;
  }

  const totalAtomicGasFee = (atomicQuoteGasFee ?? ethers.constants.Zero).add(
    additionalGasFeeInHex ?? ethers.constants.Zero,
  );

  return gasTokenBalance.atomicBalance.gte(totalAtomicGasFee);
};

import {
  formatChainIdToCaip,
  formatChainIdToHex,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import type { CaipChainId, Hex } from '@metamask/utils';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';

import { isNumberValue } from '../../../../../util/number/bigint';
import { useLatestBalance } from '../useLatestBalance';
import type { useBatchSellQuoteData } from '../useBatchSellQuoteData';

type BatchSellNetworkFee = ReturnType<
  typeof useBatchSellQuoteData
>['networkFee'];

interface Props {
  isGasless: boolean;
  networkFee: BatchSellNetworkFee;
}

/**
 * @returns null if the fee token balance is not available, true if the balance is sufficient, false if the balance is insufficient
 */
export const useBatchSellHasSufficientGas = ({
  isGasless,
  networkFee,
}: Props): boolean | null => {
  const networkFeeAsset = networkFee.asset;
  const networkFeeChainId = networkFeeAsset?.chainId;

  let hexOrCaipChainId: CaipChainId | Hex | undefined;
  if (networkFeeChainId) {
    hexOrCaipChainId = isNonEvmChainId(networkFeeChainId)
      ? formatChainIdToCaip(networkFeeChainId)
      : formatChainIdToHex(networkFeeChainId);
  }

  const feeTokenBalance = useLatestBalance({
    address: networkFeeAsset?.address,
    chainId: hexOrCaipChainId,
    decimals: networkFeeAsset?.decimals,
  });

  // TODO figure out what happen when the transactions array is empty in obtainBatchSellQuotes endpoint
  if (isGasless) {
    return true;
  }

  const networkFeeAmount =
    isNumberValue(networkFee.amount) && networkFee.amount != null
      ? new BigNumber(networkFee.amount).toFixed()
      : null;
  const atomicNetworkFee =
    networkFeeAmount && networkFeeAsset?.decimals !== undefined
      ? ethers.utils.parseUnits(networkFeeAmount, networkFeeAsset.decimals)
      : null;

  return feeTokenBalance?.atomicBalance && atomicNetworkFee
    ? feeTokenBalance.atomicBalance.gte(atomicNetworkFee)
    : null;
};

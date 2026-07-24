import { Hex, CaipChainId, parseCaipAssetType } from '@metamask/utils';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';

import { isNumberValue } from '../../../../../util/number/bigint';
import { useLatestBalance } from '../useLatestBalance';
import type { useBatchSellQuoteData } from '../useBatchSellQuoteData';
import {
  formatAddressToCaipReference,
  formatChainIdToHex,
  isNonEvmChainId,
  formatChainIdToCaip,
} from '@metamask/bridge-controller';

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
  const networkFeeChainId = networkFeeAsset?.assetId
    ? parseCaipAssetType(networkFeeAsset?.assetId)?.chainId
    : undefined;

  let hexOrCaipChainId: CaipChainId | Hex | undefined;
  if (networkFeeChainId) {
    hexOrCaipChainId = isNonEvmChainId(networkFeeChainId)
      ? formatChainIdToCaip(networkFeeChainId)
      : formatChainIdToHex(networkFeeChainId);
  }

  const feeTokenBalance = useLatestBalance({
    address: networkFeeAsset
      ? formatAddressToCaipReference(networkFeeAsset.assetId)
      : undefined,
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

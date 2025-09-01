import BN from 'bnjs4';
import { Hex } from '@metamask/utils';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { useCallback } from 'react';

import { AssetType } from '../../types/token';
import { fromBNWithDecimals } from '../../utils/send';
import { useSendContext } from '../../context/send-context';
import { useBalance } from './useBalance';
import { useGasFeeEstimatesForSend } from './useGasFeeEstimatesForSend';
import { useSendType } from './useSendType';

export interface GasFeeEstimatesType {
  medium: {
    suggestedMaxFeePerGas: number;
  };
}

const NATIVE_TRANSFER_GAS_LIMIT = 21000;
const GWEI_TO_WEI_CONVERSION_RATE = 1e9;

export const getEstimatedTotalGas = (gasFeeEstimates: GasFeeEstimatesType) => {
  if (!gasFeeEstimates) {
    return new BN(0);
  }
  const {
    medium: { suggestedMaxFeePerGas },
  } = gasFeeEstimates;
  const totalGas = new BN(suggestedMaxFeePerGas * NATIVE_TRANSFER_GAS_LIMIT);
  const conversionrate = new BN(GWEI_TO_WEI_CONVERSION_RATE);
  return totalGas.mul(conversionrate);
};

export const getPercentageValueFn = ({
  asset,
  gasFeeEstimates,
  isEvmSendType,
  percentage,
  rawBalanceBN,
}: {
  asset?: AssetType;
  gasFeeEstimates: GasFeeEstimatesType;
  isEvmSendType?: boolean;
  percentage: number;
  rawBalanceBN: BN;
}) => {
  if (!asset) {
    return '0';
  }
  let estimatedTotalGas = new BN('0');
  if (isEvmSendType && percentage === 100) {
    const nativeTokenAddressForChainId = getNativeTokenAddress(
      asset?.chainId as Hex,
    );
    if (
      nativeTokenAddressForChainId.toLowerCase() === asset.address.toLowerCase()
    ) {
      estimatedTotalGas = getEstimatedTotalGas(gasFeeEstimates);
    }
  }

  let percentageValue = rawBalanceBN.sub(estimatedTotalGas);
  if (percentage !== 100) {
    percentageValue = percentageValue.mul(new BN(percentage)).div(new BN(100));
  }

  return fromBNWithDecimals(percentageValue, asset.decimals);
};

export const usePercentageAmount = () => {
  const { asset } = useSendContext();
  const { isEvmSendType, isNonEvmNativeSendType } = useSendType();
  const { rawBalanceBN } = useBalance();
  const { gasFeeEstimates } = useGasFeeEstimatesForSend();

  const getPercentageAmount = useCallback(
    (percentage: number) =>
      getPercentageValueFn({
        asset: asset as AssetType,
        gasFeeEstimates: gasFeeEstimates as unknown as GasFeeEstimatesType,
        isEvmSendType,
        percentage,
        rawBalanceBN,
      }),
    [asset, gasFeeEstimates, isEvmSendType, rawBalanceBN],
  );

  return {
    getPercentageAmount,
    isMaxAmountSupported: !isNonEvmNativeSendType,
  };
};

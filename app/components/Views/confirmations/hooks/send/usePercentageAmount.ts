import BN from 'bnjs4';
import { Hex } from '@metamask/utils';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { useCallback } from 'react';

import { NETWORKS_CHAIN_ID } from '../../../../../constants/network';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { AssetType } from '../../types/token';
import { fromBNWithDecimals, getLayer1GasFeeForSend } from '../../utils/send';
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

export const getEstimatedTotalGas = (
  gasFeeEstimates: GasFeeEstimatesType,
  layer1GasFee: Hex,
) => {
  if (!gasFeeEstimates) {
    return new BN(0);
  }
  const {
    medium: { suggestedMaxFeePerGas },
  } = gasFeeEstimates;
  const totalGas = new BN(suggestedMaxFeePerGas * NATIVE_TRANSFER_GAS_LIMIT);

  const conversionrate = new BN(GWEI_TO_WEI_CONVERSION_RATE);
  return totalGas.mul(conversionrate).add(new BN(layer1GasFee));
};

export const getPercentageValueFn = ({
  asset,
  gasFeeEstimates,
  isEvmSendType,
  layer1GasFee,
  percentage,
  rawBalanceBN,
}: {
  asset?: AssetType;
  gasFeeEstimates: GasFeeEstimatesType;
  isEvmSendType?: boolean;
  layer1GasFee: Hex;
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
      estimatedTotalGas = getEstimatedTotalGas(gasFeeEstimates, layer1GasFee);
    }
  }

  let percentageValue = rawBalanceBN.sub(estimatedTotalGas);
  let decimals = asset.decimals;

  if (percentage !== 100) {
    percentageValue = percentageValue.mul(new BN(percentage));
    decimals += 2;
  }

  return fromBNWithDecimals(percentageValue, decimals);
};

export const usePercentageAmount = () => {
  const { asset, chainId, from, value } = useSendContext();
  const { isEvmSendType, isEvmNativeSendType, isNonEvmNativeSendType } =
    useSendType();
  const { rawBalanceBN } = useBalance();
  const { gasFeeEstimates } = useGasFeeEstimatesForSend();

  const { value: layer1GasFee } = useAsyncResult(async () => {
    if (!isEvmNativeSendType || asset?.chainId === NETWORKS_CHAIN_ID.MAINNET) {
      return '0x0';
    }
    return await getLayer1GasFeeForSend({
      asset: asset as AssetType,
      chainId: chainId as Hex,
      from: from as Hex,
      value: value as string,
    });
  }, [asset, chainId, from, value]);

  const getPercentageAmount = useCallback(
    (percentage: number) => {
      if (isNonEvmNativeSendType) return undefined;
      return getPercentageValueFn({
        asset: asset as AssetType,
        gasFeeEstimates: gasFeeEstimates as unknown as GasFeeEstimatesType,
        isEvmSendType,
        layer1GasFee: layer1GasFee ?? '0x0',
        percentage,
        rawBalanceBN,
      });
    },
    [
      asset,
      gasFeeEstimates,
      isEvmSendType,
      isNonEvmNativeSendType,
      layer1GasFee,
      rawBalanceBN,
    ],
  );

  return {
    getPercentageAmount,
    isMaxAmountSupported: !isNonEvmNativeSendType,
  };
};

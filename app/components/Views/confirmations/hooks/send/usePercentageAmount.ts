import BN from 'bnjs4';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { useCallback } from 'react';

import { hexToBN } from '../../../../../util/number';
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
  return totalGas.mul(conversionrate).add(hexToBN(layer1GasFee));
};

export const getPercentageValueFn = ({
  asset,
  gasFeeEstimates,
  isEvmNativeSendType,
  layer1GasFee,
  percentage,
  rawBalanceBN,
}: {
  asset?: AssetType;
  gasFeeEstimates: GasFeeEstimatesType;
  isEvmNativeSendType?: boolean;
  layer1GasFee: Hex;
  percentage: number;
  rawBalanceBN: BN;
}) => {
  if (!asset) {
    return '0';
  }
  let estimatedTotalGas = new BN('0');

  if (isEvmNativeSendType && percentage === 100) {
    estimatedTotalGas = getEstimatedTotalGas(gasFeeEstimates, layer1GasFee);
  }

  let percentageValue = rawBalanceBN.sub(estimatedTotalGas);

  if (percentage !== 100) {
    percentageValue = percentageValue.mul(new BN(percentage)).div(new BN(100));
  }

  if (percentageValue.isNeg() || percentageValue.isZero()) {
    return '0';
  }

  return fromBNWithDecimals(percentageValue, asset.decimals);
};

export const usePercentageAmount = () => {
  const { asset, chainId, from, value } = useSendContext();
  const { isEvmNativeSendType, isNonEvmNativeSendType } = useSendType();
  const { rawBalanceBN } = useBalance();
  const { gasFeeEstimates } = useGasFeeEstimatesForSend();

  const { value: layer1GasFee } = useAsyncResult(async () => {
    if (!isEvmNativeSendType || asset?.chainId === CHAIN_IDS.MAINNET || !from) {
      return '0x0';
    }
    return await getLayer1GasFeeForSend({
      asset: asset as AssetType,
      chainId: chainId as Hex,
      from: from as Hex,
      value: (value ?? '0') as string,
    });
  }, [asset, chainId, from, value]);

  const getPercentageAmount = useCallback(
    (percentage: number) => {
      if (isNonEvmNativeSendType) return undefined;
      return getPercentageValueFn({
        asset: asset as AssetType,
        gasFeeEstimates: gasFeeEstimates as unknown as GasFeeEstimatesType,
        isEvmNativeSendType,
        layer1GasFee: layer1GasFee ?? '0x0',
        percentage,
        rawBalanceBN,
      });
    },
    [
      asset,
      gasFeeEstimates,
      isEvmNativeSendType,
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

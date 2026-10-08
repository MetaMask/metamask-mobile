import BN from 'bnjs4';
import { useCallback } from 'react';

import { useParams } from '../../../../../util/navigation/navUtils';
import { AssetType } from '../../types/token';
import { fromBNWithDecimals, PredefinedRecipient } from '../../utils/send';
import { useSendContext } from '../../context/send-context';
import { useBalance } from './useBalance';
import { useSendMaxGas, useSendMaxGasEstimator } from './useSendMaxGas';
import { useSendType } from './useSendType';

export const getPercentageValueFn = ({
  asset,
  gasCost,
  percentage,
  rawBalanceBN,
}: {
  asset?: AssetType;
  gasCost?: BN;
  percentage: number;
  rawBalanceBN: BN;
}) => {
  if (!asset) {
    return '0';
  }
  if (percentage === 100 && gasCost === undefined) {
    return undefined;
  }

  const estimatedTotalGas = gasCost ?? new BN('0');
  if (rawBalanceBN.lt(estimatedTotalGas)) {
    return '0';
  }

  let percentageValue = rawBalanceBN;
  if (percentage === 100) {
    percentageValue = rawBalanceBN.sub(estimatedTotalGas);
  } else {
    percentageValue = percentageValue.mul(new BN(percentage)).div(new BN(100));
  }

  return fromBNWithDecimals(percentageValue, asset.decimals);
};

/**
 * Returns a function that estimates the native Max amount for a recipient on
 * demand, without estimating in the background.
 */
export const useMaxAmount = () => {
  const { getGasCost } = useSendMaxGasEstimator();
  const getMaxAmount = useGetMaxAmount(getGasCost);
  return { getMaxAmount };
};

export const usePercentageAmount = () => {
  const { asset, from, to } = useSendContext();
  const { predefinedRecipient } =
    useParams<{
      predefinedRecipient: PredefinedRecipient;
    }>() || {};
  const recipient = to || predefinedRecipient?.address || from;
  const { isNonEvmNativeSendType } = useSendType();
  const { rawBalanceBN } = useBalance();
  const { gasCost, getGasCost } = useSendMaxGas(recipient);
  const getMaxAmount = useGetMaxAmount(getGasCost);

  const getPercentageAmount = useCallback(
    (percentage: number) => {
      if (isNonEvmNativeSendType && percentage === 100) return undefined;
      return getPercentageValueFn({
        asset: asset as AssetType,
        gasCost,
        percentage,
        rawBalanceBN,
      });
    },
    [asset, gasCost, isNonEvmNativeSendType, rawBalanceBN],
  );

  const isMaxAmountSupported = !isNonEvmNativeSendType && gasCost !== undefined;

  return {
    getMaxAmount,
    getPercentageAmount,
    isMaxAmountSupported,
  };
};

function useGetMaxAmount(
  getGasCost: ReturnType<typeof useSendMaxGasEstimator>['getGasCost'],
) {
  const { asset } = useSendContext();
  const { isNonEvmNativeSendType } = useSendType();
  const { rawBalanceBN } = useBalance();

  return useCallback(
    async (recipientAddress: string) => {
      if (isNonEvmNativeSendType) {
        return undefined;
      }

      return getPercentageValueFn({
        asset: asset as AssetType,
        gasCost: await getGasCost(recipientAddress),
        percentage: 100,
        rawBalanceBN,
      });
    },
    [asset, getGasCost, isNonEvmNativeSendType, rawBalanceBN],
  );
}

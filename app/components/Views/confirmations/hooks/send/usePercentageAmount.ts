import BN from 'bnjs4';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { useCallback } from 'react';

import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { AssetType } from '../../types/token';
import {
  getEstimatedTotalGas,
  type GasFeeEstimatesType,
} from '../../utils/estimated-total-gas';
import { fromBNWithDecimals, getLayer1GasFeeForSend } from '../../utils/send';
import { useSendContext } from '../../context/send-context';
import { useBalance } from './useBalance';
import { useGasFeeEstimatesForSend } from './useGasFeeEstimatesForSend';
import { useSendType } from './useSendType';
import { useIsNetworkGasSponsored } from '../../../../UI/Bridge/hooks/useIsNetworkGasSponsored';
import { isHardwareAccount } from '../../../../../util/address';

// Re-exported from their extracted leaf module (`utils/estimated-total-gas`)
// so existing consumers of this hook module keep working.
export { getEstimatedTotalGas };
export type { GasFeeEstimatesType };

export const getPercentageValueFn = ({
  asset,
  gasFeeEstimates,
  isEvmNativeSendType,
  layer1GasFee,
  percentage,
  rawBalanceBN,
  isGasSponsored,
}: {
  asset?: AssetType;
  gasFeeEstimates: GasFeeEstimatesType;
  isEvmNativeSendType?: boolean;
  layer1GasFee: Hex;
  percentage: number;
  rawBalanceBN: BN;
  isGasSponsored: boolean;
}) => {
  if (!asset) {
    return '0';
  }
  let estimatedTotalGas = new BN('0');

  if (isEvmNativeSendType && !isGasSponsored) {
    estimatedTotalGas = getEstimatedTotalGas(gasFeeEstimates, layer1GasFee);
  }

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

export const usePercentageAmount = () => {
  const { asset, chainId, from, value } = useSendContext();
  const { isEvmNativeSendType, isNonEvmNativeSendType } = useSendType();
  const { rawBalanceBN } = useBalance();
  const { gasFeeEstimates } = useGasFeeEstimatesForSend();
  const isHardwareWallet = Boolean(from && isHardwareAccount(from));
  const isNetworkGasSponsored = useIsNetworkGasSponsored(chainId);
  const isGasSponsored = Boolean(isNetworkGasSponsored && !isHardwareWallet);

  const { value: layer1GasFee } = useAsyncResult(async () => {
    if (!isEvmNativeSendType || asset?.chainId === CHAIN_IDS.MAINNET || !from) {
      return '0x0';
    }
    return (await getLayer1GasFeeForSend({
      asset: asset as AssetType,
      chainId: chainId as Hex,
      from: from as Hex,
      value: (value ?? '0') as string,
    })) as Hex;
  }, [asset, chainId, from, value]);

  const getPercentageAmount = useCallback(
    (percentage: number) => {
      if (isNonEvmNativeSendType && percentage === 100) return undefined;
      return getPercentageValueFn({
        asset: asset as AssetType,
        gasFeeEstimates: gasFeeEstimates as unknown as GasFeeEstimatesType,
        isEvmNativeSendType,
        layer1GasFee: layer1GasFee ?? '0x0',
        percentage,
        rawBalanceBN,
        isGasSponsored,
      });
    },
    [
      asset,
      gasFeeEstimates,
      isEvmNativeSendType,
      isNonEvmNativeSendType,
      layer1GasFee,
      rawBalanceBN,
      isGasSponsored,
    ],
  );

  return {
    getPercentageAmount,
    isMaxAmountSupported: !isNonEvmNativeSendType,
  };
};

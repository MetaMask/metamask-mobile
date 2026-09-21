import BN from 'bnjs4';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { useCallback, useEffect, useRef } from 'react';

import { estimateGas } from '../../../../../util/transaction-controller';
import { useParams } from '../../../../../util/navigation/navUtils';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { AssetType } from '../../types/token';
import {
  fromBNWithDecimals,
  getLayer1GasFeeForSend,
  prepareEVMTransaction,
  PredefinedRecipient,
  toBNWithDecimals,
} from '../../utils/send';
import { useSendContext } from '../../context/send-context';
import { useBalance } from './useBalance';
import { useGasFeeEstimatesForSend } from './useGasFeeEstimatesForSend';
import { useSendType } from './useSendType';
import { useIsNetworkGasSponsored } from '../../../../UI/Bridge/hooks/useIsNetworkGasSponsored';
import { isHardwareAccount } from '../../../../../util/address';

export interface GasFeeEstimatesType {
  gasPrice?: string;
  medium?:
    | string
    | {
        suggestedMaxFeePerGas: number | string;
      };
}

const GWEI_DECIMALS = 9;

const getSuggestedGasFeePerGas = (gasFeeEstimates?: GasFeeEstimatesType) => {
  if (typeof gasFeeEstimates?.medium === 'string') {
    return gasFeeEstimates.medium;
  }
  return (
    gasFeeEstimates?.medium?.suggestedMaxFeePerGas.toString() ??
    gasFeeEstimates?.gasPrice
  );
};

export const getEstimatedTotalGas = (
  gasFeeEstimates: GasFeeEstimatesType,
  gasLimit: Hex,
  layer1GasFee: string,
) => {
  const suggestedGasFeePerGas = getSuggestedGasFeePerGas(gasFeeEstimates);
  if (suggestedGasFeePerGas === undefined) {
    return undefined;
  }

  const maxFeePerGasWei = toBNWithDecimals(
    suggestedGasFeePerGas,
    GWEI_DECIMALS,
  );

  const gasLimitBN = new BN(gasLimit.slice(2), 16);
  const layer1GasFeeBN = new BN(layer1GasFee.replace(/^0x/u, ''), 16);

  return maxFeePerGasWei.mul(gasLimitBN).add(layer1GasFeeBN);
};

export const getPercentageValueFn = ({
  asset,
  gasFeeEstimates,
  gasLimit,
  isEvmNativeSendType,
  layer1GasFee,
  percentage,
  rawBalanceBN,
  isGasSponsored,
}: {
  asset?: AssetType;
  gasFeeEstimates?: GasFeeEstimatesType;
  gasLimit?: Hex;
  isEvmNativeSendType?: boolean;
  layer1GasFee?: string;
  percentage: number;
  rawBalanceBN: BN;
  isGasSponsored: boolean;
}) => {
  if (!asset) {
    return '0';
  }

  let estimatedTotalGas = new BN('0');
  if (isEvmNativeSendType && !isGasSponsored) {
    const gasTotal =
      gasFeeEstimates && gasLimit && layer1GasFee
        ? getEstimatedTotalGas(gasFeeEstimates, gasLimit, layer1GasFee)
        : undefined;
    if (percentage === 100 && gasTotal === undefined) {
      return undefined;
    }
    estimatedTotalGas = gasTotal ?? estimatedTotalGas;
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
  const { asset, chainId, from, to, value } = useSendContext();
  const { predefinedRecipient } =
    useParams<{
      predefinedRecipient: PredefinedRecipient;
    }>() || {};
  const recipient = to || predefinedRecipient?.address || from;
  const { isEvmNativeSendType, isNonEvmNativeSendType } = useSendType();
  const { rawBalanceBN } = useBalance();
  const { gasFeeEstimates, networkClientId } = useGasFeeEstimatesForSend();
  const isHardwareWallet = Boolean(from && isHardwareAccount(from));
  const isNetworkGasSponsored = useIsNetworkGasSponsored(chainId);
  const isGasSponsored = Boolean(isNetworkGasSponsored && !isHardwareWallet);

  const estimateGasLimit = useCallback(
    async (recipientAddress?: string, transactionValue = value ?? '0') => {
      if (
        !isEvmNativeSendType ||
        isGasSponsored ||
        !asset ||
        !chainId ||
        !from ||
        !recipientAddress ||
        !networkClientId
      ) {
        return undefined;
      }

      const transaction = prepareEVMTransaction(asset as AssetType, {
        from,
        to: recipientAddress,
        value: transactionValue,
      });
      const { gas, simulationFails } = await estimateGas(
        transaction,
        networkClientId,
      );

      return simulationFails ? undefined : (gas as Hex);
    },
    [
      asset,
      chainId,
      from,
      isEvmNativeSendType,
      isGasSponsored,
      networkClientId,
      value,
    ],
  );

  const getLayer1GasFee = useCallback(
    async (recipientAddress?: string, transactionValue = value ?? '0') => {
      if (
        !isEvmNativeSendType ||
        isGasSponsored ||
        asset?.chainId === CHAIN_IDS.MAINNET
      ) {
        return '0x0' as Hex;
      }
      if (!asset || !chainId || !from || !recipientAddress) {
        return undefined;
      }

      return await getLayer1GasFeeForSend({
        asset: asset as AssetType,
        chainId: chainId as Hex,
        from: from as Hex,
        networkClientId,
        to: recipientAddress as Hex,
        value: transactionValue,
      });
    },
    [
      asset,
      chainId,
      from,
      isEvmNativeSendType,
      isGasSponsored,
      networkClientId,
      value,
    ],
  );

  const estimationKey = [
    asset?.address,
    asset?.chainId,
    chainId,
    from,
    isEvmNativeSendType,
    isGasSponsored,
    networkClientId,
    recipient,
    value,
  ].join(':');
  const estimationKeyRef = useRef(estimationKey);
  const { value: estimatedGasLimit } = useAsyncResult(
    () => estimateGasLimit(recipient),
    [estimateGasLimit, recipient],
  );
  const { value: estimatedLayer1GasFee } = useAsyncResult(
    () => getLayer1GasFee(recipient),
    [getLayer1GasFee, recipient],
  );
  const isCurrentEstimation = estimationKeyRef.current === estimationKey;
  const gasLimit = isCurrentEstimation ? estimatedGasLimit : undefined;
  const layer1GasFee = isCurrentEstimation ? estimatedLayer1GasFee : undefined;

  useEffect(() => {
    estimationKeyRef.current = estimationKey;
  }, [estimationKey]);

  const getPercentageAmount = useCallback(
    (percentage: number) => {
      if (isNonEvmNativeSendType && percentage === 100) return undefined;
      return getPercentageValueFn({
        asset: asset as AssetType,
        gasFeeEstimates: gasFeeEstimates as unknown as GasFeeEstimatesType,
        gasLimit,
        isEvmNativeSendType,
        layer1GasFee,
        percentage,
        rawBalanceBN,
        isGasSponsored,
      });
    },
    [
      asset,
      gasFeeEstimates,
      gasLimit,
      isEvmNativeSendType,
      isNonEvmNativeSendType,
      layer1GasFee,
      rawBalanceBN,
      isGasSponsored,
    ],
  );

  const getMaxAmount = useCallback(
    async (recipientAddress: string) => {
      if (isNonEvmNativeSendType) {
        return undefined;
      }
      if (!isEvmNativeSendType || isGasSponsored) {
        return getPercentageValueFn({
          asset: asset as AssetType,
          gasFeeEstimates: gasFeeEstimates as unknown as GasFeeEstimatesType,
          isEvmNativeSendType,
          percentage: 100,
          rawBalanceBN,
          isGasSponsored,
        });
      }

      const [gasLimitResult, layer1GasFeeResult] = await Promise.allSettled([
        estimateGasLimit(recipientAddress),
        getLayer1GasFee(recipientAddress),
      ]);
      if (
        gasLimitResult.status === 'rejected' ||
        layer1GasFeeResult.status === 'rejected'
      ) {
        return undefined;
      }

      return getPercentageValueFn({
        asset: asset as AssetType,
        gasFeeEstimates: gasFeeEstimates as unknown as GasFeeEstimatesType,
        gasLimit: gasLimitResult.value,
        isEvmNativeSendType,
        layer1GasFee: layer1GasFeeResult.value,
        percentage: 100,
        rawBalanceBN,
        isGasSponsored,
      });
    },
    [
      asset,
      estimateGasLimit,
      gasFeeEstimates,
      getLayer1GasFee,
      isEvmNativeSendType,
      isGasSponsored,
      isNonEvmNativeSendType,
      rawBalanceBN,
    ],
  );

  const isGasEstimateReady = Boolean(
    getSuggestedGasFeePerGas(
      gasFeeEstimates as unknown as GasFeeEstimatesType,
    ) && gasLimit,
  );
  const isLayer1GasFeeReady = Boolean(layer1GasFee);
  const isMaxAmountSupported =
    !isNonEvmNativeSendType &&
    (!isEvmNativeSendType ||
      isGasSponsored ||
      (isGasEstimateReady && isLayer1GasFeeReady));

  return {
    getMaxAmount,
    getPercentageAmount,
    isMaxAmountSupported,
  };
};

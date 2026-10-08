import BN from 'bnjs4';
import type { SingleChainGasFeeState } from '@metamask/gas-fee-controller';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { estimateGas } from '../../../../../util/transaction-controller';
import { isHardwareAccount } from '../../../../../util/address';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { useIsNetworkGasSponsored } from '../../../../UI/Bridge/hooks/useIsNetworkGasSponsored';
import { useSendContext } from '../../context/send-context';
import { AssetType } from '../../types/token';
import {
  fromBNWithDecimals,
  getLayer1GasFeeForSend,
  prepareEVMTransaction,
  toBNWithDecimals,
} from '../../utils/send';
import { useBalance } from './useBalance';
import { useGasFeeEstimatesForSend } from './useGasFeeEstimatesForSend';
import { useSendType } from './useSendType';

export type GasFeeEstimates = SingleChainGasFeeState['gasFeeEstimates'];

const GWEI_DECIMALS = 9;

export const getEstimatedTotalGas = (
  gasFeeEstimates: GasFeeEstimates,
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

/**
 * Returns a function that estimates, on demand, the gas cost to reserve when
 * sending the native Max amount to a recipient.
 *
 * The estimated gas cost is zero when no gas needs to be reserved, and
 * `undefined` when a required estimate is unavailable.
 */
export const useSendMaxGasEstimator = () => {
  const { getGasCost } = useGasCostEstimator();
  return { getGasCost };
};

/**
 * Estimates in the background the gas cost to reserve when sending the native
 * Max amount to a recipient.
 *
 * `gasCost` is zero when no gas needs to be reserved, and `undefined` while a
 * required estimate is pending, has failed, or belongs to an outdated
 * transaction.
 *
 * @param recipient - The recipient to estimate the transaction with.
 */
export const useSendMaxGas = (recipient?: string) => {
  const {
    estimateGasLimit,
    estimationKey: transactionKey,
    gasFeeEstimates,
    getGasCost,
    getLayer1GasFee,
    isGasReserved,
  } = useGasCostEstimator();

  const estimationKey = `${transactionKey}:${recipient}`;
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

  const gasCost = useMemo(
    () =>
      isGasReserved
        ? calculateGasCost(gasFeeEstimates, gasLimit, layer1GasFee)
        : new BN(0),
    [gasFeeEstimates, gasLimit, isGasReserved, layer1GasFee],
  );

  return { gasCost, getGasCost };
};

function getSuggestedGasFeePerGas(gasFeeEstimates?: GasFeeEstimates) {
  if (!gasFeeEstimates) {
    return undefined;
  }
  if ('gasPrice' in gasFeeEstimates) {
    return gasFeeEstimates.gasPrice;
  }
  if (!('medium' in gasFeeEstimates)) {
    return undefined;
  }
  const { medium } = gasFeeEstimates;
  return typeof medium === 'string' ? medium : medium.suggestedMaxFeePerGas;
}

function calculateGasCost(
  gasFeeEstimates?: GasFeeEstimates,
  gasLimit?: Hex,
  layer1GasFee?: string,
) {
  return gasFeeEstimates && gasLimit && layer1GasFee
    ? getEstimatedTotalGas(gasFeeEstimates, gasLimit, layer1GasFee)
    : undefined;
}

function useGasCostEstimator() {
  const { asset, chainId, from } = useSendContext();
  const { isEvmNativeSendType } = useSendType();
  const { rawBalanceBN } = useBalance();
  const { gasFeeEstimates, networkClientId } = useGasFeeEstimatesForSend();
  const isHardwareWallet = Boolean(from && isHardwareAccount(from));
  const isNetworkGasSponsored = useIsNetworkGasSponsored(chainId);
  const isGasSponsored = Boolean(isNetworkGasSponsored && !isHardwareWallet);
  const isGasReserved = Boolean(isEvmNativeSendType && !isGasSponsored);

  // `eth_estimateGas` without fee fields only requires the value to be covered
  // by the balance, and a simple send's gas does not depend on the value, so
  // estimate with the full balance once rather than on every amount change.
  const maxTransactionValue = asset
    ? fromBNWithDecimals(rawBalanceBN, (asset as AssetType).decimals)
    : '0';

  const estimationKey = [
    asset?.address,
    asset?.chainId,
    chainId,
    from,
    isEvmNativeSendType,
    isGasSponsored,
    maxTransactionValue,
    networkClientId,
  ].join(':');

  const estimateGasLimit = useCallback(
    async (recipientAddress?: string) => {
      if (
        !isGasReserved ||
        !asset ||
        !chainId ||
        !from ||
        !recipientAddress ||
        !networkClientId
      ) {
        return undefined;
      }

      return await estimateMaxSendGasLimit({
        asset: asset as AssetType,
        from,
        networkClientId,
        to: recipientAddress,
        value: maxTransactionValue,
      });
    },
    [asset, chainId, from, isGasReserved, maxTransactionValue, networkClientId],
  );

  const getLayer1GasFee = useCallback(
    async (recipientAddress?: string) => {
      if (!isGasReserved || asset?.chainId === CHAIN_IDS.MAINNET) {
        return '0x0' as Hex;
      }
      if (!asset || !chainId || !from || !recipientAddress) {
        return undefined;
      }

      return await estimateMaxSendLayer1GasFee({
        asset: asset as AssetType,
        chainId: chainId as Hex,
        from: from as Hex,
        networkClientId,
        to: recipientAddress as Hex,
        value: maxTransactionValue,
      });
    },
    [asset, chainId, from, isGasReserved, maxTransactionValue, networkClientId],
  );

  const getGasCost = useCallback(
    async (recipientAddress: string) => {
      if (!isGasReserved) {
        return new BN(0);
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

      return calculateGasCost(
        gasFeeEstimates,
        gasLimitResult.value,
        layer1GasFeeResult.value,
      );
    },
    [estimateGasLimit, gasFeeEstimates, getLayer1GasFee, isGasReserved],
  );

  return {
    estimateGasLimit,
    estimationKey,
    gasFeeEstimates,
    getGasCost,
    getLayer1GasFee,
    isGasReserved,
  };
}

/**
 * Estimates the gas limit of a native send with the node.
 *
 * @param args - The estimate arguments.
 * @param args.asset - The native asset being sent.
 * @param args.from - The sender address.
 * @param args.networkClientId - The network client to estimate with.
 * @param args.to - The recipient address.
 * @param args.value - The amount to send, in decimal native units.
 * @returns The estimated gas limit, or `undefined` if the simulation failed.
 */
async function estimateMaxSendGasLimit({
  asset,
  from,
  networkClientId,
  to,
  value,
}: {
  asset: AssetType;
  from: string;
  networkClientId: string;
  to: string;
  value: string;
}) {
  const transaction = prepareEVMTransaction(asset, { from, to, value });
  const { gas, simulationFails } = await estimateGas(
    transaction,
    networkClientId,
  );

  return simulationFails ? undefined : (gas as Hex);
}

/**
 * Estimates the layer 1 fee of a native send.
 *
 * @param args - The estimate arguments, as accepted by `getLayer1GasFeeForSend`.
 * @returns The layer 1 fee, or `0x0` for chains without a layer 1 fee flow.
 */
async function estimateMaxSendLayer1GasFee(
  args: Parameters<typeof getLayer1GasFeeForSend>[0],
) {
  const layer1GasFee = await getLayer1GasFeeForSend(args);

  // Chains without a layer 1 gas fee flow resolve to undefined.
  return layer1GasFee ?? ('0x0' as Hex);
}

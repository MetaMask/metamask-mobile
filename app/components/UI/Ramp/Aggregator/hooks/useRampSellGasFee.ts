import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GasFeeEstimateLevel,
  GasFeeEstimateType,
  GasFeeEstimates,
  TransactionParams,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { NetworkClientId } from '@metamask/network-controller';

import {
  estimateGasBuffered,
  estimateGasFee,
} from '../../../../../util/transaction-controller';
import { fetchEstimatedMultiLayerL1Fee } from '../../../../../util/networks/engineNetworkUtils';
import useInterval from '../../../../hooks/useInterval';
import { useNetworkTier } from '../../../../../hooks/useNetworkTier';
import { getRampGasBufferMultiplier } from '../utils/getRampGasBufferMultiplier';

const REFRESH_INTERVAL_MS = 15_000;
const SLOW_CELLULAR_REFRESH_INTERVAL_MS = 60_000;

export type RampSellGasFee =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; gasFeeWei: bigint }
  | { status: 'error' };

export interface UseRampSellGasFeeArgs {
  networkClientId?: NetworkClientId;
  chainId?: Hex;
  transaction?: TransactionParams;
  level: GasFeeEstimateLevel;
}

function getFeePerGas(
  estimates: GasFeeEstimates,
  level: GasFeeEstimateLevel,
): bigint {
  if (estimates.type === GasFeeEstimateType.FeeMarket) {
    return BigInt(estimates[level].maxFeePerGas);
  }

  if (estimates.type === GasFeeEstimateType.Legacy) {
    return BigInt(estimates[level]);
  }

  return BigInt(estimates.gasPrice);
}

/**
 * Estimates the network fee for one Ramp sell transaction shape using the
 * node result, the same gas buffer core applies and the chain's fee rate.
 *
 * The reservation is only trustworthy while refreshes keep succeeding. When
 * the newest success — or, before the first success, the start of the
 * estimate for this transaction — is two refresh intervals old, the state
 * falls back to `error` so Max becomes unavailable until a later refresh
 * succeeds. This also covers requests that hang and never settle.
 *
 * @param args - The transaction shape and the fee level to reserve.
 * @returns The reservation state. Max must stay unavailable unless `ready`.
 */
export default function useRampSellGasFee({
  networkClientId,
  chainId,
  transaction,
  level,
}: UseRampSellGasFeeArgs): RampSellGasFee {
  const networkTier = useNetworkTier();
  const isOffline = networkTier === 'NONE';

  const { from, to, value, data } = transaction ?? {};
  const key = useMemo(
    () =>
      networkClientId && chainId && transaction
        ? [
            networkClientId,
            chainId,
            from ?? '',
            to ?? '',
            value ?? '',
            data ?? '',
            level,
          ].join('|')
        : undefined,
    [networkClientId, chainId, transaction, from, to, value, data, level],
  );

  const isEnabled = key !== undefined && !isOffline;

  const refreshDelay =
    networkTier === 'SLOW_CELLULAR'
      ? SLOW_CELLULAR_REFRESH_INTERVAL_MS
      : REFRESH_INTERVAL_MS;
  const staleAfterMs = refreshDelay * 2;

  const [state, setState] = useState<RampSellGasFee>({ status: 'idle' });
  const transactionRef = useRef(transaction);
  transactionRef.current = transaction;
  const requestIdRef = useRef(0);
  const keyRef = useRef<string | undefined>(undefined);
  const hasReadyForKeyRef = useRef(false);
  // Start of the stale window: the newest success, or the start of the
  // estimate for the current key before any success.
  const freshSinceRef = useRef(0);
  const staleAfterMsRef = useRef(staleAfterMs);
  staleAfterMsRef.current = staleAfterMs;
  // Start time of the request in flight for the current key, or null.
  const inFlightStartedAtRef = useRef<number | null>(null);

  const runEstimate = useCallback(async () => {
    const currentTransaction = transactionRef.current;
    if (!networkClientId || !chainId || !currentTransaction || isOffline) {
      return;
    }

    const staleWindowMs = staleAfterMsRef.current;
    const now = Date.now();

    // Checked before the request so a hanging request cannot keep an old
    // reservation, or a first estimate, pending forever: the next interval
    // marks it stale.
    if (now - freshSinceRef.current >= staleWindowMs) {
      setState({ status: 'error' });
    }

    // Let a slow request land instead of cancelling it; replace it only once
    // it has outlived the stale window.
    const inFlightStartedAt = inFlightStartedAtRef.current;
    if (inFlightStartedAt !== null && now - inFlightStartedAt < staleWindowMs) {
      return;
    }

    const requestId = ++requestIdRef.current;
    inFlightStartedAtRef.current = now;

    try {
      const multiplier = getRampGasBufferMultiplier(chainId, networkClientId);
      const [gasEstimate, gasFee] = await Promise.all([
        estimateGasBuffered(currentTransaction, multiplier, networkClientId),
        estimateGasFee({
          transactionParams: currentTransaction,
          chainId,
          networkClientId,
        }),
      ]);

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (gasEstimate.simulationFails) {
        throw new Error('Sell gas estimation simulation failed');
      }

      const l1Fee = await fetchEstimatedMultiLayerL1Fee(null, {
        chainId,
        networkClientId,
        txParams: currentTransaction,
      });

      if (requestId !== requestIdRef.current) {
        return;
      }

      const gasFeeWei =
        BigInt(gasEstimate.gas) * getFeePerGas(gasFee.estimates, level) +
        (l1Fee ? BigInt(`0x${l1Fee}`) : 0n);

      hasReadyForKeyRef.current = true;
      freshSinceRef.current = Date.now();
      setState({ status: 'ready', gasFeeWei });
    } catch {
      if (requestId !== requestIdRef.current) {
        return;
      }

      // One failed refresh inside the window keeps the last trustworthy
      // reservation; past it, the reservation is no longer current.
      if (
        hasReadyForKeyRef.current &&
        Date.now() - freshSinceRef.current < staleWindowMs
      ) {
        return;
      }

      setState({ status: 'error' });
    } finally {
      if (requestId === requestIdRef.current) {
        inFlightStartedAtRef.current = null;
      }
    }
  }, [chainId, isOffline, level, networkClientId]);

  useEffect(() => {
    if (!isEnabled) {
      requestIdRef.current += 1;
      keyRef.current = undefined;
      hasReadyForKeyRef.current = false;
      freshSinceRef.current = 0;
      inFlightStartedAtRef.current = null;
      setState({ status: 'idle' });
      return;
    }

    if (keyRef.current !== key) {
      keyRef.current = key;
      hasReadyForKeyRef.current = false;
      freshSinceRef.current = Date.now();
      setState({ status: 'loading' });
    }

    runEstimate().catch(() => undefined);

    return () => {
      requestIdRef.current += 1;
      inFlightStartedAtRef.current = null;
    };
  }, [isEnabled, key, runEstimate]);

  useInterval(
    () => {
      runEstimate().catch(() => undefined);
    },
    {
      delay: isEnabled ? refreshDelay : null,
    },
  );

  return state;
}

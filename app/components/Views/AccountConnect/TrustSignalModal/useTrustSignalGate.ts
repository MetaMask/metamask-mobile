import { useCallback, useEffect, useRef } from 'react';
import { getHost } from '../../../../util/browser';
import { useOriginTrustSignals } from '../../confirmations/hooks/useOriginTrustSignals';
import { TrustSignalDisplayState } from '../../confirmations/types/trustSignals';
import { AccountConnectScreens } from '../AccountConnect.types';

export const DEV_TRUST_SIGNAL_OVERRIDES: Partial<
  Record<string, TrustSignalDisplayState>
> = __DEV__
  ? {
      'app.uniswap.org': TrustSignalDisplayState.Verified,
      'revoke.cash': TrustSignalDisplayState.Malicious,
    }
  : {};

/**
 * Computes trust signal state for the given origin.
 * Call BEFORE the `useState` for `screen` so the initial value can be set
 * correctly without a flash.
 */
export function useTrustSignalState(origin: string) {
  const { state: raw } = useOriginTrustSignals(origin);
  const trustSignalState = DEV_TRUST_SIGNAL_OVERRIDES[getHost(origin)] ?? raw;
  const needsTrustSignalGate =
    trustSignalState === TrustSignalDisplayState.Malicious;
  return { trustSignalState, needsTrustSignalGate };
}

/**
 * Wires up the async-arrival effect and the dismiss handler for the trust
 * signal gate. Call AFTER the `useState` for `screen`.
 */
export function useTrustSignalGateControl(
  needsTrustSignalGate: boolean,
  setScreen: React.Dispatch<React.SetStateAction<AccountConnectScreens>>,
) {
  const gateDismissedRef = useRef(false);

  useEffect(() => {
    if (needsTrustSignalGate && !gateDismissedRef.current) {
      setScreen((prev) => {
        // Don't interrupt screens that are already blocking gates, and avoid a
        // no-op re-render when we're already on the warning screen itself.
        if (
          prev === AccountConnectScreens.TrustSignalWarning ||
          prev === AccountConnectScreens.MaliciousWarning
        ) {
          return prev;
        }
        // Gate fires regardless of which "browse" screen the user reached while
        // the async dapp-scanning result was in flight.
        return AccountConnectScreens.TrustSignalWarning;
      });
    }
  }, [needsTrustSignalGate, setScreen]);

  const handleTrustSignalDismiss = useCallback(() => {
    gateDismissedRef.current = true;
    setScreen(AccountConnectScreens.SingleConnect);
  }, [setScreen]);

  return { handleTrustSignalDismiss };
}

import { useCallback, useMemo } from 'react';
import Engine from '../../../../core/Engine';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller';
import {
  PERPS_SLIPPAGE_DEFAULT_BPS,
  type MaxSlippageSource,
} from '../constants/slippageConfig';
import { usePerpsSelector } from './usePerpsSelector';

export interface UsePerpsMaxSlippageReturn {
  /** Resolved max slippage in basis points (falls back to the documented default). */
  maxSlippageBps: number;
  /** Indicates whether the value comes from a persisted user choice or the default. */
  maxSlippageSource: MaxSlippageSource;
  /** Persist a new max-slippage value (basis points). */
  setMaxSlippage: (bps: number) => void;
}

/**
 * Reads the user's persisted max slippage out of `PerpsController` so the
 * order screen never reaches across the controller boundary directly. Returns
 * both the resolved bps value and the source (default vs user-configured) so
 * callers can pass `max_slippage_source` to MetaMetrics without re-running the
 * lookup. Exposes a `setMaxSlippage` helper that writes through to the
 * controller; all hook instances subscribe to the same controller state.
 */
export function usePerpsMaxSlippage(): UsePerpsMaxSlippageReturn {
  const stored = usePerpsSelector((state) => state?.maxSlippageBps);

  const setMaxSlippage = useCallback((bps: number) => {
    Engine.context.PerpsController?.setMaxSlippage(bps);
  }, []);

  return useMemo(() => {
    const maxSlippageBps = stored ?? PERPS_SLIPPAGE_DEFAULT_BPS;
    const maxSlippageSource: MaxSlippageSource =
      stored === undefined
        ? PERPS_EVENT_VALUE.MAX_SLIPPAGE_SOURCE.DEFAULT
        : PERPS_EVENT_VALUE.MAX_SLIPPAGE_SOURCE.USER_CONFIGURED;
    return {
      maxSlippageBps,
      maxSlippageSource,
      setMaxSlippage,
    };
  }, [setMaxSlippage, stored]);
}

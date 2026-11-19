import { useMemo } from 'react';
import {
  calculateProjectedEarnings,
  PROJECTION_YEARS,
} from '../utils/projections';
import useMoneyAccountBalance from './useMoneyAccountBalance';
import useMoneyVaultApy from './useMoneyVaultApy';

export interface UseMoneyAccountProjectedEarningsOptions {
  enabled?: boolean;
}

export interface UseMoneyAccountProjectedEarningsResult {
  /** Current vault balance in fiat (mUSD is 1:1 with USD). */
  balanceFiat: number | undefined;
  /** Current vault APY as a decimal (e.g. 0.04 for 4%). */
  apyDecimal: number | undefined;
  /**
   * Projected earnings over `PROJECTION_YEARS` at the current balance and APY.
   * Undefined when either input is unavailable — callers should hide the
   * projected row rather than show a fallback to make the degradation visible.
   */
  projectedAmount: number | undefined;
}

/**
 * Projects forward earnings on the Money account's current vault balance at
 * the current APY. Prefer this over trailing extrapolations (e.g.
 * `last_30d * 12`) because it reacts immediately to deposits and withdrawals
 * and matches the user's mental model of "what I'd earn if I leave this here".
 */
const useMoneyAccountProjectedEarnings = ({
  enabled = true,
}: UseMoneyAccountProjectedEarningsOptions = {}): UseMoneyAccountProjectedEarningsResult => {
  const { totalFiatRaw } = useMoneyAccountBalance({ enabled });
  const { apyDecimal } = useMoneyVaultApy({ enabled });

  const balanceFiat = useMemo(() => {
    if (totalFiatRaw === undefined) {
      return undefined;
    }
    const parsed = Number(totalFiatRaw);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [totalFiatRaw]);

  const projectedAmount = useMemo(() => {
    if (balanceFiat === undefined || apyDecimal === undefined) {
      return undefined;
    }
    return calculateProjectedEarnings(
      balanceFiat,
      apyDecimal,
      PROJECTION_YEARS,
    );
  }, [balanceFiat, apyDecimal]);

  return { balanceFiat, apyDecimal, projectedAmount };
};

export default useMoneyAccountProjectedEarnings;

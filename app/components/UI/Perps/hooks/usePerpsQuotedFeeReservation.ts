import { useEffect } from 'react';
import { usePerpsOrderContext } from '../contexts/PerpsOrderContext';

/**
 * Reserves the displayed fee quote in the order form's max size, so sizing and
 * the fee summary share one rate. An unavailable quote (`undefined`) reserves
 * nothing.
 *
 * @param totalFeeRate - `OrderFeesResult.totalFeeRate` of the displayed quote.
 */
export function usePerpsQuotedFeeReservation(
  totalFeeRate: number | undefined,
): void {
  const { setEstimatedFeeRate } = usePerpsOrderContext();
  useEffect(() => {
    setEstimatedFeeRate(totalFeeRate ?? 0);
  }, [totalFeeRate, setEstimatedFeeRate]);
}

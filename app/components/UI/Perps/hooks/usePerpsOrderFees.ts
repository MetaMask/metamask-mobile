import { useMemo, useState, useEffect } from 'react';
import { usePerpsTrading } from './usePerpsTrading';

/**
 * Fee calculation result with loading states
 */
export interface OrderFeesResult {
  /** Total fee in USD (protocol + MetaMask) */
  totalFee: number;
  /** Protocol trading fee in USD */
  protocolFee: number;
  /** MetaMask service fee in USD */
  metamaskFee: number;
  /** Protocol fee rate as decimal (e.g., 0.00045 for 0.045%) */
  protocolFeeRate: number;
  /** MetaMask fee rate as decimal (e.g., 0.01 for 1%) */
  metamaskFeeRate: number;
  /** Loading state for MetaMask fee (future API integration) */
  isLoadingMetamaskFee: boolean;
  /** Error state for fee calculation */
  error: string | null;
}

interface UsePerpsOrderFeesParams {
  /** Order type - market or limit */
  orderType: 'market' | 'limit';
  /** Order amount in USD */
  amount: string;
  /** Whether this is a maker order (for protocols that differentiate) */
  isMaker?: boolean;
}

/**
 * Hook to calculate order fees (protocol + MetaMask)
 * Protocol-agnostic - each provider determines its own fee structure
 *
 * @param params Order parameters for fee calculation
 * @returns Fee calculation results with loading states
 */
export function usePerpsOrderFees({
  orderType,
  amount,
  isMaker = false,
}: UsePerpsOrderFeesParams): OrderFeesResult {
  const { calculateFees } = usePerpsTrading();

  // State for fees from provider
  const [protocolFeeRate, setProtocolFeeRate] = useState(0);
  const [metamaskFeeRate, setMetamaskFeeRate] = useState(0);
  const [totalFeeRate, setTotalFeeRate] = useState(0);
  const [isLoadingFees, setIsLoadingFees] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch fees from provider (includes breakdown)
  useEffect(() => {
    const fetchFees = async () => {
      try {
        setIsLoadingFees(true);
        setError(null);

        // Get fee breakdown from the active provider
        const result = await calculateFees({ orderType, isMaker, amount });

        // Provider now returns complete breakdown
        setProtocolFeeRate(result.protocolFeeRate);
        setMetamaskFeeRate(result.metamaskFeeRate);
        setTotalFeeRate(result.feeRate);

        // TODO: Future enhancement - fetch user tier and apply MetaMask fee discounts
        // const userDiscount = await fetchMetaMaskFeeDiscount();
        // const adjustedMetamaskRate = result.metamaskFeeRate * (1 - userDiscount);
        // setMetamaskFeeRate(adjustedMetamaskRate);
        // setTotalFeeRate(result.protocolFeeRate + adjustedMetamaskRate);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch fees');
        // Reset all rates on error
        setProtocolFeeRate(0);
        setMetamaskFeeRate(0);
        setTotalFeeRate(0);
      } finally {
        setIsLoadingFees(false);
      }
    };

    fetchFees();
  }, [orderType, isMaker, amount, calculateFees]);

  return useMemo(() => {
    const amountNum = parseFloat(amount || '0');

    // Calculate fee amounts based on rates
    const protocolFee = amountNum * protocolFeeRate;
    const metamaskFee = amountNum * metamaskFeeRate;
    const totalFee = amountNum * totalFeeRate;

    return {
      totalFee,
      protocolFee,
      metamaskFee,
      protocolFeeRate,
      metamaskFeeRate,
      isLoadingMetamaskFee: isLoadingFees,
      error,
    };
  }, [
    amount,
    protocolFeeRate,
    metamaskFeeRate,
    totalFeeRate,
    isLoadingFees,
    error,
  ]);
}

/**
 * Format fee rate as percentage
 * @param rate Fee rate as decimal (e.g., 0.00045)
 * @returns Formatted percentage string (e.g., "0.045%") or "N/A" if invalid
 */
export function formatFeeRate(rate: number | undefined | null): string {
  if (rate === undefined || rate === null || isNaN(rate)) {
    return 'N/A';
  }
  return `${(rate * 100).toFixed(3)}%`;
}

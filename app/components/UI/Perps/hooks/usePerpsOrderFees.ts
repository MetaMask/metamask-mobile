import { useMemo, useState, useEffect } from 'react';
import { usePerpsTrading } from './usePerpsTrading';
import { METAMASK_FEE_CONFIG } from '../constants/perpsConfig';

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

  // State for future MetaMask fee API
  // When API is ready, we'll uncomment the state and effect below
  // const [metamaskFeeRate, setMetamaskFeeRate] = useState(METAMASK_FEE_CONFIG.TRADING_FEE_RATE);
  // const [isLoadingMetamaskFee, setIsLoadingMetamaskFee] = useState(false);
  // const [error, setError] = useState<string | null>(null);

  // For now, use static values
  const metamaskFeeRate = METAMASK_FEE_CONFIG.TRADING_FEE_RATE;
  const isLoadingMetamaskFee = false;
  const [error, setError] = useState<string | null>(null);

  // Future: Fetch MetaMask fee from API
  // useEffect(() => {
  //   const fetchMetamaskFee = async () => {
  //     try {
  //       setIsLoadingMetamaskFee(true);
  //       setError(null);
  //
  //       const response = await fetch('/api/v1/perps/fees/metamask', {
  //         method: 'POST',
  //         body: JSON.stringify({
  //           orderType,
  //           amount,
  //           protocol: 'hyperliquid',
  //           userTier: await getUserTier(),
  //         }),
  //       });
  //       const data = await response.json();
  //       setMetamaskFeeRate(data.feeRate);
  //     } catch (err) {
  //       setError(err instanceof Error ? err.message : 'Failed to fetch MetaMask fee');
  //       setMetamaskFeeRate(METAMASK_FEE_CONFIG.TRADING_FEE_RATE);
  //     } finally {
  //       setIsLoadingMetamaskFee(false);
  //     }
  //   };
  //
  //   fetchMetamaskFee();
  // }, [orderType, amount]);

  // State for protocol fees
  const [protocolFeeRate, setProtocolFeeRate] = useState(0);
  const [isLoadingProtocolFee, setIsLoadingProtocolFee] = useState(true);

  // Fetch protocol fees
  useEffect(() => {
    const fetchProtocolFees = async () => {
      try {
        setIsLoadingProtocolFee(true);
        setError(null);

        // Get protocol-specific fees from the active provider
        const result = await calculateFees({ orderType, isMaker, amount });
        setProtocolFeeRate(result.feeRate);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch protocol fees',
        );
        // Don't set a fallback - let the UI handle the error state
        // This maintains protocol agnosticism
        setProtocolFeeRate(0);
      } finally {
        setIsLoadingProtocolFee(false);
      }
    };

    fetchProtocolFees();
  }, [orderType, isMaker, amount, calculateFees]);

  return useMemo(() => {
    const amountNum = parseFloat(amount || '0');

    // Calculate fees
    const protocolFee = amountNum * protocolFeeRate;
    const metamaskFee = amountNum * metamaskFeeRate;

    return {
      totalFee: protocolFee + metamaskFee,
      protocolFee,
      metamaskFee,
      protocolFeeRate,
      metamaskFeeRate,
      isLoadingMetamaskFee: isLoadingProtocolFee || isLoadingMetamaskFee,
      error,
    };
  }, [
    amount,
    protocolFeeRate,
    metamaskFeeRate,
    isLoadingProtocolFee,
    isLoadingMetamaskFee,
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

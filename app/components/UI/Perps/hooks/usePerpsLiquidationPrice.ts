import { useEffect, useState } from 'react';
import { usePerpsTrading } from './usePerpsTrading';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';

interface LiquidationPriceParams {
  entryPrice: number;
  leverage: number;
  direction: 'long' | 'short';
  asset: string;
}

/**
 * Hook to calculate liquidation price based on trading parameters
 * @param params - Parameters for liquidation price calculation
 * @returns Liquidation price as a formatted string
 */
export const usePerpsLiquidationPrice = (params: LiquidationPriceParams) => {
  const { calculateLiquidationPrice } = usePerpsTrading();
  const [liquidationPrice, setLiquidationPrice] = useState<string>('0.00');
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const calculatePrice = async () => {
      const { entryPrice, leverage, direction, asset } = params;

      // Skip calculation if invalid parameters
      if (entryPrice <= 0 || leverage <= 0 || !asset) {
        setLiquidationPrice('0.00');
        return;
      }

      try {
        setIsCalculating(true);
        setError(null);

        const price = await calculateLiquidationPrice({
          entryPrice,
          leverage,
          direction,
          asset,
          marginType: 'isolated', // We use isolated margin for all orders
        });

        setLiquidationPrice(price);
      } catch (err) {
        DevLogger.log('Error calculating liquidation price:', err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to calculate liquidation price';

        setError(errorMessage);

        // For invalid leverage errors, show a clear message instead of 0.00
        if (errorMessage.includes('Invalid leverage')) {
          setLiquidationPrice('N/A');
        } else {
          setLiquidationPrice('0.00');
        }
      } finally {
        setIsCalculating(false);
      }
    };

    calculatePrice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Destructure params to avoid re-renders when object reference changes
    params.entryPrice,
    params.leverage,
    params.direction,
    params.asset,
    calculateLiquidationPrice,
  ]);

  return {
    liquidationPrice,
    isCalculating,
    error,
  };
};

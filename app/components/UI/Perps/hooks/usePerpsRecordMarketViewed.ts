import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import Engine from '../../../../core/Engine';

/**
 * Records the market as recently viewed whenever this screen is focused.
 *
 * `useFocusEffect` (rather than a mount-keyed `useEffect`) is required because
 * `navigation.navigate()` can reveal an already-mounted MARKET_DETAILS instance
 * (e.g. from the homepage) instead of remounting it, which would otherwise skip
 * the view recording entirely.
 */
export function usePerpsRecordMarketViewed(symbol?: string): void {
  useFocusEffect(
    useCallback(() => {
      if (symbol) {
        Engine.context.PerpsController.recordMarketViewed(symbol);
      }
    }, [symbol]),
  );
}

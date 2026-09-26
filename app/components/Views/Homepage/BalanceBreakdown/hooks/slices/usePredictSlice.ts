import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { usePredictPortfolio } from '../../../../../UI/Predict/hooks/usePredictPortfolio';
import { selectPredictEnabledFlag } from '../../../../../UI/Predict/selectors/featureFlags';
import type { BalanceSlice, FiatConverter } from '../../types';

export function usePredictSlice(toUserCurrency: FiatConverter): BalanceSlice {
  const isEnabled = useSelector(selectPredictEnabledFlag);
  // Portfolio request failures (e.g. geo-blocked Predict endpoints) are not
  // propagated as a slice error: dashing this row and muting the wallet total
  // would report a single product's outage as an unknown wallet balance.
  const { portfolioValue, isLoading } = usePredictPortfolio({
    enabled: isEnabled,
    // PredictionsSection owns the homepage live-price subscription and updates
    // the shared positions query cache consumed by this aggregate.
    livePriceUpdates: false,
  });

  const convertedValue = toUserCurrency(portfolioValue);

  const status = useMemo(() => {
    if (!isEnabled) return 'ineligible' as const;
    if (isLoading) return 'loading' as const;
    if (convertedValue === undefined) return 'error' as const;
    return 'ready' as const;
  }, [convertedValue, isEnabled, isLoading]);

  const valueFiat = status === 'ready' ? (convertedValue ?? 0) : 0;

  return useMemo(
    () => ({
      key: 'predict' as const,
      isVisible: isEnabled,
      valueFiat,
      status,
    }),
    [isEnabled, status, valueFiat],
  );
}

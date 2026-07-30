import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { usePredictPortfolio } from '../../../../UI/Predict/hooks/usePredictPortfolio';
import { selectPredictEnabledFlag } from '../../../../UI/Predict/selectors/featureFlags';
import type { BalanceSlice, FiatConverter } from '../../types';

export function usePredictSlice(toUserCurrency: FiatConverter): BalanceSlice {
  const isEnabled = useSelector(selectPredictEnabledFlag);
  const { portfolioValue, isLoading, error } = usePredictPortfolio();

  const convertedValue = toUserCurrency(portfolioValue);

  const status = useMemo(() => {
    if (!isEnabled) return 'ineligible' as const;
    if (error) return 'error' as const;
    if (isLoading) return 'loading' as const;
    if (convertedValue === undefined) return 'loading' as const;
    return 'ready' as const;
  }, [convertedValue, error, isEnabled, isLoading]);

  const valueFiat = status === 'ready' ? (convertedValue ?? 0) : 0;

  return useMemo(
    () => ({
      key: 'predict' as const,
      valueFiat,
      status,
    }),
    [status, valueFiat],
  );
}

import { useMemo } from 'react';
import { useTokenAmount } from '../useTokenAmount';
import { AlertKeys } from '../../constants/alerts';
import { Alert, Severity } from '../../types/alerts';
import { BigNumber } from 'bignumber.js';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';

export const MINIMUM_DEPOSIT_USD = 10;

export function usePerpsDepositMinimumAlert(): Alert[] {
  const { usdValue } = useTokenAmount();

  const underMinimum = new BigNumber(usdValue ?? '0').isLessThan(
    MINIMUM_DEPOSIT_USD,
  );

  return useMemo(() => {
    if (!underMinimum) {
      return [];
    }

    return [
      {
        key: AlertKeys.PerpsDepositMinimum,
        field: RowAlertKey.Amount,
        message: `Min order value is $10`,
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [underMinimum]);
}

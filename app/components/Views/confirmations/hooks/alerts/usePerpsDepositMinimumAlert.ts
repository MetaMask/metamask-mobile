import { useMemo } from 'react';
import { useTokenAmount } from '../useTokenAmount';
import { AlertKeys } from '../../constants/alerts';
import { Alert, Severity } from '../../types/alerts';
import { BigNumber } from 'bignumber.js';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { TransactionType } from '@metamask/transaction-controller';

export const MINIMUM_DEPOSIT_USD = 10;

export function usePerpsDepositMinimumAlert(): Alert[] {
  const { type } = useTransactionMetadataRequest() ?? {};
  const { amountUnformatted } = useTokenAmount();

  const underMinimum =
    new BigNumber(amountUnformatted ?? '0').isLessThan(MINIMUM_DEPOSIT_USD) &&
    type === TransactionType.perpsDeposit;

  return useMemo(() => {
    if (!underMinimum) {
      return [];
    }

    return [
      {
        key: AlertKeys.PerpsDepositMinimum,
        field: RowAlertKey.Amount,
        message: strings('alert_system.perps_deposit_minimum.message'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [underMinimum]);
}

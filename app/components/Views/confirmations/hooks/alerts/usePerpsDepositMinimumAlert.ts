import { useMemo } from 'react';
import { useTokenAmount } from '../useTokenAmount';
import { AlertKeys } from '../../constants/alerts';
import { Alert, Severity } from '../../types/alerts';
import { BigNumber } from 'bignumber.js';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { TransactionType } from '@metamask/transaction-controller';
import { PERPS_MINIMUM_DEPOSIT } from '../../constants/perps';

export function usePerpsDepositMinimumAlert({
  pendingTokenAmount,
}: {
  pendingTokenAmount?: string;
} = {}): Alert[] {
  const { type } = useTransactionMetadataRequest() ?? {};
  const { amountUnformatted } = useTokenAmount();

  const underMinimum =
    new BigNumber(pendingTokenAmount ?? amountUnformatted ?? '0').isLessThan(
      PERPS_MINIMUM_DEPOSIT,
    ) && type === TransactionType.perpsDeposit;

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

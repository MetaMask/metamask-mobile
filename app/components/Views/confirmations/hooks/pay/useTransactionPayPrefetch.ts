import { useSelector } from 'react-redux';
import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { selectMoneyAccountDepositQuotePipelineEnabled } from '../../../../../selectors/featureFlagController/moneyAccount';
import { getMoneyAccountDepositIntent } from '../../../../UI/Money/utils/moneyAccountDepositIntent';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayFiatPayment } from './useTransactionPayData';

/**
 * Whether the pay amount can be committed as the user types, so a quote is
 * already in flight by the time they continue.
 *
 * Only generic and convert crypto deposits qualify. `addMusd` uses the Relay
 * max/gas-station path and `card` uses the multi-stage fiat path, so both keep
 * committing on Continue until validated separately.
 *
 * @returns Whether prefetching is enabled for the current confirmation.
 */
export function useTransactionPayPrefetch(): { enabled: boolean } {
  const transactionMeta = useTransactionMetadataRequest();
  const fiatPayment = useTransactionPayFiatPayment();
  const isQuotePipelineEnabled = useSelector(
    selectMoneyAccountDepositQuotePipelineEnabled,
  );

  const isMoneyAccountDeposit = Boolean(
    transactionMeta &&
      hasTransactionType(transactionMeta, [
        TransactionType.moneyAccountDeposit,
      ]),
  );

  const depositIntent =
    isMoneyAccountDeposit && transactionMeta
      ? getMoneyAccountDepositIntent(transactionMeta.batchId)
      : undefined;

  const enabled = Boolean(
    isQuotePipelineEnabled &&
      isMoneyAccountDeposit &&
      (depositIntent === undefined || depositIntent === 'convert') &&
      !fiatPayment?.selectedPaymentMethodId,
  );

  return { enabled };
}

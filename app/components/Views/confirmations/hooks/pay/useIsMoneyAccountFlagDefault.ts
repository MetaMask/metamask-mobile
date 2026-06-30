import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import { selectMetaMaskPayFlags } from '../../../../../selectors/featureFlagController/confirmations';
import { useParams } from '../../../../../util/navigation/navUtils';
import { ConfirmationParams } from '../../components/confirm/confirm-component';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  getTransactionType,
  hasTransactionType,
} from '../../utils/transaction';

const PERPS_PREDICT_TRANSACTION_TYPES: TransactionType[] = [
  TransactionType.perpsDeposit,
  TransactionType.perpsWithdraw,
  TransactionType.predictDeposit,
  TransactionType.predictWithdraw,
];

/**
 * Returns `true` when the `defaultPaySelectedSection` feature flag is
 * `"money-account"` and the user has a money account, while no explicit
 * `payWithOption` nav-param overrides the selection.
 *
 * Only applies to perps / predict transaction types so that the flag
 * does not accidentally default money-account for unrelated flows.
 *
 * This value is derived synchronously at render time so consumers can
 * use it on the very first render — no effect delay, no flash.
 */
export function useIsMoneyAccountFlagDefault(): boolean {
  const { payWithOption } = useParams<ConfirmationParams>({});
  const moneyAccount = useSelector(selectPrimaryMoneyAccount);
  const { defaultPaySelectedSection } = useSelector(selectMetaMaskPayFlags);
  const transactionMeta = useTransactionMetadataRequest();

  const isPerpsOrPredict = hasTransactionType(
    transactionMeta,
    PERPS_PREDICT_TRANSACTION_TYPES,
  );

  const effectiveType = getTransactionType(transactionMeta);
  const sectionForType = effectiveType
    ? defaultPaySelectedSection?.[effectiveType]
    : undefined;

  return (
    !payWithOption &&
    sectionForType === 'money-account' &&
    !!moneyAccount &&
    isPerpsOrPredict
  );
}

import { useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  TransactionMeta,
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { PaymentOverride } from '@metamask/transaction-pay-controller';
import { createProjectLogger } from '@metamask/utils';
import { RootState } from '../../../../../reducers';
import { selectMetaMaskPayFlags } from '../../../../../selectors/featureFlagController/confirmations';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import { selectPaymentOverrideByTransactionId } from '../../../../../selectors/transactionPayController';
import {
  isHardwareAccount,
  isQRHardwareAccount,
} from '../../../../../util/address';
import { getTransactionType } from '../../utils/transaction';
import { applyMoneyAccountOverride } from '../../utils/transaction-pay';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { usePayMoneyAccountAvailable } from './usePayMoneyAccountAvailable';

const log = createProjectLogger('transaction-pay');

const MONEY_ACCOUNT_FALLBACK_DEPOSIT_TYPES: TransactionType[] = [
  TransactionType.perpsDeposit,
  TransactionType.predictDeposit,
];

/**
 * Auto-selects the Money account for Perps and Predict deposits when the
 * selected EOA has no token balance and the Money account has a positive
 * balance. Existing token auto-select is left unchanged whenever any token
 * balance exists.
 */
export function useAutomaticMoneyAccountPayToken({
  autoSelectFiatPayment = false,
  disable = false,
  hasFiatPaymentSelected,
  hasTokenBalance,
  payTokenSelected,
}: {
  autoSelectFiatPayment?: boolean;
  disable?: boolean;
  hasFiatPaymentSelected: boolean;
  hasTokenBalance: boolean;
  payTokenSelected: boolean;
}): { isPending: boolean; shouldSelect: boolean } {
  const isUpdated = useRef<string | undefined>(undefined);
  const transactionMetaRequest = useTransactionMetadataRequest();
  const transactionMeta = useMemo(
    () => transactionMetaRequest ?? ({ txParams: {} } as TransactionMeta),
    [transactionMetaRequest],
  );
  const transactionId = transactionMeta.id;
  const from = transactionMeta.txParams?.from;
  const isHardwareWallet = isHardwareAccount(from ?? '') ?? false;
  const isQRWallet = isQRHardwareAccount(from ?? '');

  const paymentOverride = useSelector((state: RootState) =>
    selectPaymentOverrideByTransactionId(state, transactionId ?? ''),
  );
  const { enableMoneyAccountTransactions } = useSelector(
    selectMetaMaskPayFlags,
  );
  const moneyAccount = useSelector(selectPrimaryMoneyAccount);
  const transactionType = getTransactionType(transactionMeta);

  // Whether the Money Account is an eligible fallback here at all. Account
  // existence and balance are answered by `usePayMoneyAccountAvailable`.
  const canUseMoneyAccountPay =
    !autoSelectFiatPayment &&
    !isHardwareWallet &&
    !isQRWallet &&
    paymentOverride !== PaymentOverride.MoneyAccount &&
    !hasTokenBalance &&
    hasTransactionType(transactionMeta, MONEY_ACCOUNT_FALLBACK_DEPOSIT_TYPES) &&
    Boolean(transactionType && enableMoneyAccountTransactions[transactionType]);

  const { isAvailable: shouldSelect, isPending } = usePayMoneyAccountAvailable({
    enabled: canUseMoneyAccountPay,
  });

  useEffect(() => {
    if (
      disable ||
      payTokenSelected ||
      hasFiatPaymentSelected ||
      !transactionId ||
      isUpdated.current === transactionId ||
      isPending ||
      !shouldSelect
    ) {
      return;
    }

    applyMoneyAccountOverride(
      transactionId,
      moneyAccount?.address,
      transactionMeta,
    );
    isUpdated.current = transactionId;
    log('Automatically selected money account (no token balance)');
  }, [
    disable,
    hasFiatPaymentSelected,
    isPending,
    moneyAccount?.address,
    payTokenSelected,
    shouldSelect,
    transactionId,
    transactionMeta,
  ]);

  return { isPending, shouldSelect };
}

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
import {
  getPreferredTokensForTransactionType,
  selectMetaMaskPayFlags,
  selectMetaMaskPayTokensFlags,
} from '../../../../../selectors/featureFlagController/confirmations';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import { selectPaymentOverrideByTransactionId } from '../../../../../selectors/transactionPayController';
import {
  isHardwareAccount,
  isQRHardwareAccount,
} from '../../../../../util/address';
import { getTransactionType } from '../../utils/transaction';
import { applyMoneyAccountOverride } from '../../utils/transaction-pay';
import { AssetType } from '../../types/token';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { usePayMoneyAccountAvailable } from './usePayMoneyAccountAvailable';

const log = createProjectLogger('transaction-pay');

const MONEY_ACCOUNT_FALLBACK_DEPOSIT_TYPES: TransactionType[] = [
  TransactionType.perpsDeposit,
  TransactionType.perpsDepositAndOrder,
  TransactionType.predictDeposit,
  TransactionType.predictDepositAndOrder,
];

/**
 * Auto-selects the Money account for Perps and Predict deposits when the
 * Money Account is the best funding source. A highest-balance preferred token
 * wins. Otherwise Money Account wins when its balance is higher than every
 * token or meets the same minimum balance configured for preferred tokens.
 */
export function useAutomaticMoneyAccountPayToken({
  autoSelectFiatPayment = false,
  availableTokens,
  disable = false,
  hasFiatPaymentSelected,
  payTokenSelected,
}: {
  autoSelectFiatPayment?: boolean;
  availableTokens: AssetType[];
  disable?: boolean;
  hasFiatPaymentSelected: boolean;
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
  const payTokensFlags = useSelector(selectMetaMaskPayTokensFlags);
  const moneyAccount = useSelector(selectPrimaryMoneyAccount);
  const transactionType = getTransactionType(transactionMeta);

  const highestBalanceToken = availableTokens
    .filter((token) => !token.disabled)
    .sort((a, b) => (b.fiat?.balance ?? 0) - (a.fiat?.balance ?? 0))[0];
  const highestTokenBalance = highestBalanceToken?.fiat?.balance ?? 0;
  const preferredTokens = getPreferredTokensForTransactionType(
    payTokensFlags.preferredTokens,
    transactionType,
  );
  const isHighestBalanceTokenPreferred = Boolean(
    highestBalanceToken?.chainId &&
      preferredTokens.some(
        (token) =>
          token.address.toLowerCase() ===
            highestBalanceToken.address.toLowerCase() &&
          token.chainId.toLowerCase() ===
            highestBalanceToken.chainId?.toLowerCase(),
      ),
  );

  // Whether the Money Account is an eligible funding source here at all. Account
  // existence and balance are answered by `usePayMoneyAccountAvailable`.
  const canUseMoneyAccountPay =
    !autoSelectFiatPayment &&
    !isHardwareWallet &&
    !isQRWallet &&
    paymentOverride !== PaymentOverride.MoneyAccount &&
    hasTransactionType(transactionMeta, MONEY_ACCOUNT_FALLBACK_DEPOSIT_TYPES) &&
    Boolean(transactionType && enableMoneyAccountTransactions[transactionType]);

  const {
    isAvailable: isMoneyAccountAvailable,
    isPending,
    withdrawableBalance,
  } = usePayMoneyAccountAvailable({ enabled: canUseMoneyAccountPay });
  const shouldSelect = Boolean(
    isMoneyAccountAvailable &&
      withdrawableBalance &&
      (withdrawableBalance.isGreaterThan(highestTokenBalance) ||
        (!isHighestBalanceTokenPreferred &&
          withdrawableBalance.isGreaterThanOrEqualTo(
            payTokensFlags.minimumRequiredTokenBalance,
          ))),
  );

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
    log('Automatically selected money account (best funding source)');
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

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { AlertKeys } from '../../constants/alerts';
import { Alert, Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionAccountOverride } from '../transactions/useTransactionAccountOverride';
import { useTransactionPayFiatPayment } from '../pay/useTransactionPayData';
import { hasTransactionType } from '../../utils/transaction';
import {
  isHardwareAccount,
  isQRHardwareAccount,
} from '../../../../../util/address';
import { selectMetaMaskPayHardwareFlags } from '../../../../../selectors/featureFlagController/confirmations';

export function useMMPayHardwareAccountAlert(): Alert[] {
  const transactionMeta = useTransactionMetadataRequest();
  const accountOverride = useTransactionAccountOverride();
  const fiatPayment = useTransactionPayFiatPayment();
  const { enabled: isHardwarePayEnabled } = useSelector(
    selectMetaMaskPayHardwareFlags,
  );

  const {
    txParams: { from },
  } = transactionMeta ?? { txParams: {} };

  const isMusdConversion = hasTransactionType(transactionMeta, [
    TransactionType.musdConversion,
  ]);

  const isMoneyAccountDeposit = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountDeposit,
  ]);

  // Money account deposits are executed by the money account itself, so
  // txParams.from is never the paying account. The account paying is the
  // override selected in PayAccountSelector.
  const payingAccount = isMoneyAccountDeposit ? accountOverride : from;

  const isHardwareWallet = isHardwareAccount(payingAccount ?? '');
  const isQRWallet = isQRHardwareAccount(payingAccount ?? '');

  // Fiat deposits are bought directly into the money account, so the
  // hardware account never signs.
  const isFiatMoneyAccountDeposit =
    isMoneyAccountDeposit && Boolean(fiatPayment?.selectedPaymentMethodId);

  return useMemo(() => {
    if (!isHardwareWallet || isFiatMoneyAccountDeposit) {
      return [];
    }

    if (isMusdConversion && isHardwarePayEnabled && !isQRWallet) {
      return [];
    }

    return [
      {
        key: AlertKeys.MMPayHardwareAccount,
        title: strings('alert_system.mmpay_hardware_account.title'),
        message: strings('alert_system.mmpay_hardware_account.message'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [
    isFiatMoneyAccountDeposit,
    isHardwareWallet,
    isHardwarePayEnabled,
    isMusdConversion,
    isQRWallet,
  ]);
}

import { TransactionType } from '@metamask/transaction-controller';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayFiatPayment } from './useTransactionPayData';
import { useMoneyAccountDepositPaymentMethods } from '../../../../UI/Ramp/hooks/useMoneyAccountDepositPaymentMethods';
import { pickEligiblePaymentMethod } from '../../../../UI/Ramp/utils/pickEligiblePaymentMethod';
import { useMMPayFiatConfig } from './useMMPayFiatConfig';
import { hasTransactionType } from '../../utils/transaction';

export function useIsMoneyAccountDepositFiatAvailable(): {
  isAvailable: boolean;
  isLoading: boolean;
} {
  const transactionMeta = useTransactionMetadataRequest();
  const isMoneyAccountDeposit = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountDeposit,
  ]);
  const fiatPayment = useTransactionPayFiatPayment();
  const { maxDelayMinutesForPaymentMethods } = useMMPayFiatConfig();
  const { paymentMethods, isReady, isLoading } =
    useMoneyAccountDepositPaymentMethods(
      isMoneyAccountDeposit ? fiatPayment?.caipAssetId : undefined,
    );

  if (!isMoneyAccountDeposit) {
    return { isAvailable: true, isLoading: false };
  }

  if (isLoading || !isReady) {
    return { isAvailable: true, isLoading: true };
  }

  const eligibleMethod = pickEligiblePaymentMethod(
    paymentMethods,
    maxDelayMinutesForPaymentMethods,
  );

  return { isAvailable: Boolean(eligibleMethod), isLoading: false };
}

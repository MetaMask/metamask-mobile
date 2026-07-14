import { TransactionType } from '@metamask/transaction-controller';
import { useRampsPaymentMethods } from '../../../../UI/Ramp/hooks/useRampsPaymentMethods';
import { useHasNativeFiatProvider } from '../../../../UI/Ramp/hooks/useHasNativeFiatProvider';
import { useRegionHasFiatProvider } from '../../../../UI/Ramp/hooks/useRegionHasFiatProvider';
import { useMoneyAccountDepositAssetId } from '../../../../UI/Money/hooks/useMoneyAccountDepositAssetId';
import { hasTransactionType } from '../../utils/transaction';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useMMPayFiatConfig } from './useMMPayFiatConfig';

/**
 * Returns whether fiat payment is available for the current transaction.
 * True when the transaction type is fiat-enabled via remote feature flags,
 * at least one Ramps payment method exists, AND headless fiat deposit is
 * available for the region and provider-class scope.
 *
 * For a Money Account deposit it additionally requires that a provider in the
 * region actually serves the deposit asset (mUSD), reusing the same asset-aware
 * `useRegionHasFiatProvider` check that gates the Money "Add funds" entry, so
 * the two cannot disagree (offering fiat where no provider can sell the asset).
 * Other fiat-enabled types (Perps, Predict) are unaffected by that asset check.
 */
export function useIsFiatPaymentAvailable(): boolean {
  const transactionMeta = useTransactionMetadataRequest();
  const { enabledTransactionTypes } = useMMPayFiatConfig();
  const { paymentMethods } = useRampsPaymentMethods();
  const hasNativeFiatProvider = useHasNativeFiatProvider();
  const depositAssetId = useMoneyAccountDepositAssetId();
  const regionServesDepositAsset = useRegionHasFiatProvider(depositAssetId);

  const isMoneyDeposit = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountDeposit,
  ]);

  return (
    hasTransactionType(transactionMeta, enabledTransactionTypes) &&
    paymentMethods.length > 0 &&
    hasNativeFiatProvider &&
    (!isMoneyDeposit || regionServesDepositAsset)
  );
}

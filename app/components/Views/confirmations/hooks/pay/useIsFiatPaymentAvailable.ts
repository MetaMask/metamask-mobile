import { useRampsPaymentMethods } from '../../../../UI/Ramp/hooks/useRampsPaymentMethods';
import { useRampsProviders } from '../../../../UI/Ramp/hooks/useRampsProviders';
import { hasTransactionType } from '../../utils/transaction';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useMMPayFiatConfig } from './useMMPayFiatConfig';

const TRANSAK_NATIVE_PROVIDER_ID_FRAGMENT = 'transak-native';

function isTransakNativeProvider(
  provider: { id?: string } | null | undefined,
): boolean {
  return (
    provider?.id?.toLowerCase().includes(TRANSAK_NATIVE_PROVIDER_ID_FRAGMENT) ??
    false
  );
}

/**
 * Returns whether fiat payment is available for the current transaction.
 * True when the transaction type is fiat-enabled via remote feature flags
 * AND the current region exposes Transak Native payment methods.
 */
export function useIsFiatPaymentAvailable(): boolean {
  const transactionMeta = useTransactionMetadataRequest();
  const { enabledTransactionTypes } = useMMPayFiatConfig();
  const { paymentMethods } = useRampsPaymentMethods();
  const { providers, selectedProvider } = useRampsProviders();

  const isSelectedProviderAvailableInRegion = providers.some(
    (provider) => provider.id === selectedProvider?.id,
  );

  return (
    hasTransactionType(transactionMeta, enabledTransactionTypes) &&
    isSelectedProviderAvailableInRegion &&
    isTransakNativeProvider(selectedProvider) &&
    paymentMethods.length > 0
  );
}

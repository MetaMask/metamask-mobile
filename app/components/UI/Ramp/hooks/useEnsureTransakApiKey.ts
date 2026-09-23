import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

import Engine from '../../../../core/Engine';
import { selectDepositProviderApiKey } from '../../../../selectors/featureFlagController/deposit';

/**
 * Sets the Transak partner API key on the shared RampsController TransakService
 * as soon as it is available from remote config.
 *
 * The native Transak buy-quote lookup (`/api/v2/lookup/quotes`, used by the
 * fiat pay fee estimate to show the real native fee) requires this key. Without
 * it the lookup throws and the estimate silently falls back to the aggregator
 * fee. The key was previously only set as a side effect of mounting
 * `useTransakController` (the widget flow), so a deposit confirmation shown
 * before the user ever entered the widget displayed the aggregator fee until a
 * later re-estimate. Mounting this hook on the confirmation sets the key up
 * front, so the first estimate reads the native fee. `transakSetApiKey` is
 * idempotent, so mounting this alongside `useTransakController` is safe.
 */
export function useEnsureTransakApiKey(): void {
  const providerApiKey = useSelector(selectDepositProviderApiKey);
  const apiKeySetRef = useRef(false);

  useEffect(() => {
    if (providerApiKey && !apiKeySetRef.current) {
      Engine.context.RampsController.transakSetApiKey(providerApiKey);
      apiKeySetRef.current = true;
    }
  }, [providerApiKey]);
}

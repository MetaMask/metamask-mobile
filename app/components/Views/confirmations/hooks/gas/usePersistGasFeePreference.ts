import { useCallback } from 'react';
import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';

import Engine from '../../../../../core/Engine';
import type { AdvancedGasFeePreferences } from '../../../../../core/Engine/controllers/preferences-controller-types';

export function usePersistGasFeePreference() {
  return useCallback(
    (
      transactionMeta: TransactionMeta | undefined,
      gasFeePreferences: AdvancedGasFeePreferences,
    ) => {
      const account = transactionMeta?.txParams?.from as Hex | undefined;
      const chainId = transactionMeta?.chainId;

      if (!account || !chainId) {
        return;
      }

      Engine.context.PreferencesController.setAdvancedGasFee({
        account,
        chainId,
        gasFeePreferences,
      });
    },
    [],
  );
}

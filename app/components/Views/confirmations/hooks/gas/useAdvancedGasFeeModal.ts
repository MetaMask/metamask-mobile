import { useCallback } from 'react';
import { pickBy } from 'lodash';
import {
  TransactionMeta,
  UserFeeLevel,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';

import { updateTransactionGasFees } from '../../../../../util/transaction-controller';
import type { AdvancedGasFeePreferences } from '../../../../../core/Engine/controllers/preferences-controller-types';
import { hasValidCustomGasFeePreferences } from './gas-fee-preference-utils';
import { usePersistGasFeePreference } from './usePersistGasFeePreference';

interface UseAdvancedGasFeeModalParams {
  transactionMeta: TransactionMeta;
  gasParams: Record<string, Hex | undefined>;
  savedGasFeePreferences: AdvancedGasFeePreferences;
  errors: Record<string, string | boolean>;
  handleCloseModals: () => void;
}

export function useAdvancedGasFeeModal({
  transactionMeta,
  gasParams,
  savedGasFeePreferences,
  errors,
  handleCloseModals,
}: UseAdvancedGasFeeModalParams) {
  const persistGasFeePreference = usePersistGasFeePreference();
  const hasError = Boolean(
    Object.values(errors).some(Boolean) ||
      !hasValidCustomGasFeePreferences(savedGasFeePreferences),
  );

  const handleSaveClick = useCallback(() => {
    if (!hasValidCustomGasFeePreferences(savedGasFeePreferences)) {
      return;
    }

    updateTransactionGasFees(transactionMeta.id, {
      userFeeLevel: UserFeeLevel.CUSTOM,
      ...pickBy(gasParams, Boolean),
    });
    persistGasFeePreference(transactionMeta, savedGasFeePreferences);
    handleCloseModals();
  }, [
    transactionMeta,
    gasParams,
    persistGasFeePreference,
    handleCloseModals,
    savedGasFeePreferences,
  ]);

  return { hasError, handleSaveClick };
}

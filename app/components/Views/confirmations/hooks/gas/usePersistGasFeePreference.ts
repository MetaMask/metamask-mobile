import { useCallback } from 'react';
import {
  UserFeeLevel,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';

import Engine from '../../../../../core/Engine';
import type { AdvancedGasFeePreferences } from '../../../../../core/Engine/controllers/preferences-controller-types';
import { hexWEIToDecGWEI } from '../../../../../util/conversions';
import { hasValidCustomGasFeePreferences } from './gas-fee-preference-utils';

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

      if (
        gasFeePreferences.userFeeLevel === UserFeeLevel.CUSTOM &&
        !hasValidCustomGasFeePreferences(gasFeePreferences)
      ) {
        return;
      }

      Engine.context.PreferencesController.setAdvancedGasFee({
        account,
        chainId,
        gasFeePreferences: normalizeGasFeePreferences(gasFeePreferences),
      });
    },
    [],
  );
}

function normalizeGasFeePreferences(
  gasFeePreferences: AdvancedGasFeePreferences,
): AdvancedGasFeePreferences {
  return {
    ...gasFeePreferences,
    ...(gasFeePreferences.maxBaseFee && {
      maxBaseFee: hexWEIToDecGWEI(
        gasFeePreferences.maxBaseFee as Hex,
      ).toString(),
    }),
    ...(gasFeePreferences.priorityFee && {
      priorityFee: hexWEIToDecGWEI(
        gasFeePreferences.priorityFee as Hex,
      ).toString(),
    }),
    ...(gasFeePreferences.gasPrice && {
      gasPrice: hexWEIToDecGWEI(gasFeePreferences.gasPrice as Hex).toString(),
    }),
  };
}

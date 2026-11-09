import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { CaipAssetType } from '@metamask/snaps-sdk';

import {
  validateTronTransferAmount,
  SnapAmountValidationResult,
} from '../../../../../core/Multichain/tron';
import { RootState } from '../../../../../reducers';
import { getMemoizedInternalAccountByAddress } from '../../../../../selectors/accountsController';
import { strings } from '../../../../../../locales/i18n';

const VALIDATION_DEBOUNCE_MS = 500;

interface UseTronAmountValidationParams {
  enabled: boolean;
  amount: string;
  assetChainId?: string;
  assetReference?: string;
  walletAddress?: string;
}

interface UseTronAmountValidationResult {
  isValidating: boolean;
  validationError: string | undefined;
}

/**
 * Maps a Tron Snap validation result to a user-facing error message.
 * Returns undefined when the transfer is valid.
 */
function getValidationErrorMessage(
  result: SnapAmountValidationResult | undefined,
): string | undefined {
  if (!result) {
    return strings(
      'fiat_on_ramp_aggregator.tron_validation.validation_unavailable',
    );
  }
  if (result.valid) {
    return undefined;
  }
  const errorCode = result.errors?.[0]?.code;
  if (errorCode === 'InsufficientBalance') {
    return strings('send.insufficient_funds');
  }
  if (errorCode === 'InsufficientBalanceToCoverFee') {
    return strings(
      'fiat_on_ramp_aggregator.send_transaction.insufficient_tron_resources',
    );
  }
  return strings('send.invalid_value');
}

/**
 * Debounced Tron amount validation for the BuildQuote screen.
 *
 * When enabled and a Tron asset + amount are selected, this hook calls the
 * Tron Snap's `onAmountInput` without a `toAddress` (balance-only validation)
 * after a debounce period. The Snap estimates fees conservatively, so the UI
 * can show an inline error and disable Continue when the amount is invalid.
 *
 * Does nothing when `enabled` is false or required params are missing.
 */
export function useTronAmountValidation({
  enabled,
  amount,
  assetChainId,
  assetReference,
  walletAddress,
}: UseTronAmountValidationParams): UseTronAmountValidationResult {
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | undefined>();
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestValidationRef = useRef(0);

  const fromAccount = useSelector((state: RootState) =>
    walletAddress
      ? getMemoizedInternalAccountByAddress(state, walletAddress)
      : undefined,
  ) as InternalAccount | undefined;

  const validate = useCallback(async () => {
    if (
      !enabled ||
      !fromAccount ||
      !assetChainId ||
      !assetReference ||
      !amount ||
      amount === '0'
    ) {
      setValidationError(undefined);
      return;
    }

    const validationId = Date.now();
    latestValidationRef.current = validationId;

    setIsValidating(true);

    try {
      const result = await validateTronTransferAmount(fromAccount, {
        accountId: fromAccount.id,
        assetId: `${assetChainId}/${assetReference}` as CaipAssetType,
        value: amount,
      });

      if (latestValidationRef.current === validationId) {
        const errorMessage = getValidationErrorMessage(result);
        setValidationError(errorMessage);
      }
    } catch {
      if (latestValidationRef.current === validationId) {
        setValidationError(
          strings(
            'fiat_on_ramp_aggregator.tron_validation.validation_unavailable',
          ),
        );
      }
    } finally {
      if (latestValidationRef.current === validationId) {
        setIsValidating(false);
      }
    }
  }, [enabled, fromAccount, assetChainId, assetReference, amount]);

  useEffect(() => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    if (!enabled || !amount || amount === '0') {
      setValidationError(undefined);
      setIsValidating(false);
      return;
    }

    validationTimeoutRef.current = setTimeout(() => {
      validate();
    }, VALIDATION_DEBOUNCE_MS);

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [enabled, amount, validate]);

  return {
    isValidating,
    validationError,
  };
}

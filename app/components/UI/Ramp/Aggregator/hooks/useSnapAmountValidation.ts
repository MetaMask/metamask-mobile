import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { CaipAssetType } from '@metamask/snaps-sdk';
import {
  isCaipChainId,
  KnownCaipNamespace,
  parseCaipChainId,
} from '@metamask/utils';

import {
  getMaxSendableAmountMultichain,
  validateAmountMultichain,
  type SnapAmountValidationResult,
} from '../../../../Views/confirmations/utils/multichain-snaps';
import { RootState } from '../../../../../reducers';
import { getMemoizedInternalAccountByAddress } from '../../../../../selectors/accountsController';
import { strings } from '../../../../../../locales/i18n';

const VALIDATION_DEBOUNCE_MS = 500;

interface UseSnapAmountValidationParams {
  enabled: boolean;
  amount: string;
  assetChainId?: string;
  assetReference?: string;
  assetSymbol?: string;
  walletAddress?: string;
}

interface UseSnapAmountValidationResult {
  isValidating: boolean;
  validationError: string | undefined;
  isDebouncing: boolean;
}

const getNamespace = (chainId?: string): string | undefined =>
  chainId && isCaipChainId(chainId)
    ? parseCaipChainId(chainId).namespace
    : undefined;

// Chains whose wallet Snap implements `onAmountInput` / `getMaxSendableAmount`.
const SNAP_AMOUNT_NAMESPACES = new Set<string>([
  KnownCaipNamespace.Tron,
  KnownCaipNamespace.Stellar,
]);

export const usesSnapAmountValidation = (chainId?: string): boolean =>
  SNAP_AMOUNT_NAMESPACES.has(getNamespace(chainId) ?? '');

const FEE_SHORTFALL_MESSAGES: Partial<Record<string, string>> = {
  [KnownCaipNamespace.Tron]:
    'fiat_on_ramp_aggregator.send_transaction.insufficient_tron_resources',
};
const DEFAULT_FEE_SHORTFALL_MESSAGE = 'send.insufficient_balance_to_cover_fee';

export const getFeeShortfallMessageKey = (chainId?: string): string =>
  FEE_SHORTFALL_MESSAGES[getNamespace(chainId) ?? ''] ??
  DEFAULT_FEE_SHORTFALL_MESSAGE;

/**
 * Maps a Snap validation result to a user-facing error message.
 * Returns undefined when the transfer is valid.
 */
function getValidationErrorMessage(
  result: SnapAmountValidationResult | undefined,
  assetChainId: string,
  maxSendable?: { amount: string; symbol: string },
): string | undefined {
  if (!result) {
    return strings(
      'fiat_on_ramp_aggregator.snap_validation.validation_unavailable',
    );
  }
  if (result.valid) {
    return undefined;
  }
  const errorCode = result.errors?.[0]?.code;
  if (errorCode === 'InsufficientBalance') {
    return maxSendable
      ? strings(
          'fiat_on_ramp_aggregator.snap_validation.insufficient_funds_max',
          { amount: maxSendable.amount, symbol: maxSendable.symbol },
        )
      : strings('send.insufficient_funds');
  }
  if (errorCode === 'InsufficientBalanceToCoverFee') {
    return strings(getFeeShortfallMessageKey(assetChainId));
  }
  return strings('send.invalid_value');
}

/**
 * Tells the user how much they can actually send (balance minus
 * reserves and fee) when an amount exceeds it. Best effort: any failure falls
 * back to the plain "Insufficient funds" message.
 */
async function getMaxSendable(
  fromAccount: InternalAccount,
  assetId: CaipAssetType,
  assetSymbol: string | undefined,
  result: SnapAmountValidationResult | undefined,
): Promise<{ amount: string; symbol: string } | undefined> {
  if (
    !assetSymbol ||
    result?.valid ||
    result?.errors?.[0]?.code !== 'InsufficientBalance'
  ) {
    return undefined;
  }
  try {
    const maxResult = await getMaxSendableAmountMultichain(fromAccount, {
      accountId: fromAccount.id,
      assetId,
    });
    return maxResult?.amount && Number(maxResult.amount) > 0
      ? { amount: maxResult.amount, symbol: assetSymbol }
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Debounced Snap amount validation (Tron, Stellar) for the BuildQuote screen.
 *
 * When enabled and a supported asset + amount are selected, this hook calls
 * the chain Snap's `onAmountInput` without a `toAddress` (balance-only
 * validation) after a debounce period. The Snap estimates fees (and, for
 * Stellar, account reserves) so the UI can show an inline error and disable
 * Continue when the amount is invalid.
 *
 * Does nothing when `enabled` is false or required params are missing.
 */
export function useSnapAmountValidation({
  enabled,
  amount,
  assetChainId,
  assetReference,
  assetSymbol,
  walletAddress,
}: UseSnapAmountValidationParams): UseSnapAmountValidationResult {
  const [isValidating, setIsValidating] = useState(false);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [validationError, setValidationError] = useState<string | undefined>();
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestValidationRef = useRef(0);

  const fromAccount = useSelector<RootState, InternalAccount | undefined>(
    (state: RootState) =>
      walletAddress
        ? getMemoizedInternalAccountByAddress(state, walletAddress)
        : undefined,
  );

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
      setIsValidating(false);
      return;
    }

    const validationId = Date.now();
    latestValidationRef.current = validationId;

    setIsValidating(true);

    try {
      const assetId = `${assetChainId}/${assetReference}` as CaipAssetType;
      const result = (await validateAmountMultichain(fromAccount, {
        accountId: fromAccount.id,
        assetId,
        value: amount,
      })) as SnapAmountValidationResult | undefined;
      const maxSendable = await getMaxSendable(
        fromAccount,
        assetId,
        assetSymbol,
        result,
      );

      if (latestValidationRef.current === validationId) {
        const errorMessage = getValidationErrorMessage(
          result,
          assetChainId,
          maxSendable,
        );
        setValidationError(errorMessage);
      }
    } catch {
      if (latestValidationRef.current === validationId) {
        setValidationError(
          strings(
            'fiat_on_ramp_aggregator.snap_validation.validation_unavailable',
          ),
        );
      }
    } finally {
      if (latestValidationRef.current === validationId) {
        setIsValidating(false);
      }
    }
  }, [enabled, fromAccount, assetChainId, assetReference, assetSymbol, amount]);

  useEffect(() => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    // Invalidate any in-flight requests by bumping the validation ID.
    // This prevents stale results from overwriting the new state.
    latestValidationRef.current = Date.now();

    if (!enabled || !amount || amount === '0') {
      setValidationError(undefined);
      setIsValidating(false);
      setIsDebouncing(false);
      return;
    }

    setIsDebouncing(true);
    validationTimeoutRef.current = setTimeout(() => {
      setIsDebouncing(false);
      void validate();
    }, VALIDATION_DEBOUNCE_MS);

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
      // Invalidate on cleanup as well to ensure any in-flight request is ignored
      latestValidationRef.current = Date.now();
      setIsDebouncing(false);
    };
  }, [enabled, amount, validate]);

  return {
    isValidating,
    validationError,
    isDebouncing,
  };
}

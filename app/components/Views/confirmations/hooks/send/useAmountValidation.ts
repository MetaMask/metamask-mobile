import { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { debounce } from 'lodash';
import BN from 'bnjs4';

import { strings } from '../../../../../../locales/i18n';
import {
  isValidPositiveNumericString,
  normalizeAmount,
  toTokenMinimalUnit,
} from '../../utils/send';
import { AssetType, Nft, TokenStandard } from '../../types/token';
import { useSendContext } from '../../context/send-context';
import { useBalance } from './useBalance';
import { useSendType } from './useSendType';
import {
  useSnapAmountOnInput,
  type SnapOnAmountInputResult,
} from './useSnapAmountOnInput';

const AMOUNT_VALIDATION_DEBOUNCE_MS = 300;

export const useAmountValidation = () => {
  const { asset, value } = useSendContext();
  const { decimals, rawBalanceBN } = useBalance();
  const { isNonEvmSendType } = useSendType();
  const { validateAmountWithSnap } = useSnapAmountOnInput();
  const [amountError, setAmountError] = useState<string | undefined>(undefined);
  const unmountedRef = useRef(false);
  const hasAttemptedContinueRef = useRef(false);
  // Monotonic id for validation runs — only the latest run may write
  // amountError, so a slow snap response can't overwrite a newer result.
  const validationSeqRef = useRef(0);

  const setAndReturnErrorIfLatest = useCallback(
    (seq: number, errorMessage: string | undefined) => {
      if (!unmountedRef.current && seq === validationSeqRef.current) {
        setAmountError(errorMessage);
      }
      return errorMessage;
    },
    [],
  );

  const validateNonEvmAmount = useCallback(
    async (amount: string): Promise<string | undefined> => {
      if (!isNonEvmSendType) {
        return undefined;
      }

      if (rawBalanceBN.isZero()) {
        return strings('send.insufficient_funds');
      }

      try {
        const result = (await validateAmountWithSnap(
          amount || '0',
        )) as SnapOnAmountInputResult;

        if (result.errors?.length > 0) {
          const errorMessage = mapSnapErrorCodeIntoTranslation(
            result.errors[0].code,
          );
          return errorMessage;
        }
        return undefined;
      } catch (error) {
        return strings('send.invalid_value');
      }
    },
    [validateAmountWithSnap, isNonEvmSendType, rawBalanceBN],
  );

  const validateAmountAsync = useCallback(async () => {
    validationSeqRef.current += 1;
    const seq = validationSeqRef.current;

    if (!value) {
      return setAndReturnErrorIfLatest(seq, undefined);
    }

    const normalizedValue = normalizeAmount(value);

    const validations = [
      () => validatePositiveNumericString(normalizedValue),
      () => validateERC1155Balance(asset as AssetType | Nft, normalizedValue),
      () => validateTokenBalance(normalizedValue, rawBalanceBN, decimals ?? 0),
      () => validateNonEvmAmount(normalizedValue),
    ];

    for (const validation of validations) {
      const error = await Promise.resolve(validation());
      if (error) {
        return setAndReturnErrorIfLatest(seq, error);
      }
    }

    return setAndReturnErrorIfLatest(seq, undefined);
  }, [
    asset,
    rawBalanceBN,
    decimals,
    value,
    validateNonEvmAmount,
    setAndReturnErrorIfLatest,
  ]);

  // This callback is needed for non-EVM validation when nothing is typed into amount
  const validateNonEvmAmountAsync = useCallback(async () => {
    hasAttemptedContinueRef.current = true;
    validationSeqRef.current += 1;
    const seq = validationSeqRef.current;

    const normalizedValue = normalizeAmount(value);
    const syncError =
      validatePositiveNumericString(normalizedValue) ??
      validateERC1155Balance(asset as AssetType | Nft, normalizedValue) ??
      validateTokenBalance(normalizedValue, rawBalanceBN, decimals ?? 0);
    if (syncError) {
      return setAndReturnErrorIfLatest(seq, syncError);
    }

    const error = await validateNonEvmAmount(normalizedValue);
    return setAndReturnErrorIfLatest(seq, error);
  }, [
    value,
    asset,
    rawBalanceBN,
    decimals,
    validateNonEvmAmount,
    setAndReturnErrorIfLatest,
  ]);

  const validateAmountAsyncRef = useRef(validateAmountAsync);
  validateAmountAsyncRef.current = validateAmountAsync;

  const debouncedSnapValidation = useMemo(
    () =>
      debounce(() => {
        validateAmountAsyncRef.current();
      }, AMOUNT_VALIDATION_DEBOUNCE_MS),
    [],
  );

  // Track mount state once so async validation can't set state after unmount.
  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
    };
  }, []);

  // EVM: run immediately — no snap RPC, so amountError must never be stale.
  useEffect(() => {
    if (!isNonEvmSendType) {
      validateAmountAsync();
    }
  }, [isNonEvmSendType, validateAmountAsync]);

  // Non-EVM: debounce to avoid a snap RPC call on every keystroke.
  // Deferred until the first Continue press so errors never flash while the
  // user is still typing; after that it re-runs on every value change so
  // amountError never goes stale. Cancel on cleanup gives real debounce
  // semantics across keystrokes.
  useEffect(() => {
    if (isNonEvmSendType && hasAttemptedContinueRef.current) {
      debouncedSnapValidation();
    }
    return () => {
      debouncedSnapValidation.cancel();
    };
  }, [isNonEvmSendType, value, debouncedSnapValidation]);

  return { amountError, validateNonEvmAmountAsync };
};

export function validateERC1155Balance(
  asset: AssetType | Nft,
  value: string | undefined,
): string | undefined {
  if (asset?.standard !== TokenStandard.ERC1155) {
    return undefined;
  }

  if (asset?.balance && value) {
    const valueInt = parseInt(value, 10);
    const balanceInt = parseInt(asset.balance.toString(), 10);
    if (valueInt > balanceInt) {
      return strings('send.insufficient_funds');
    }
  }

  return undefined;
}

export function validateTokenBalance(
  amount: string,
  rawBalanceBN: BN,
  decimals: number | undefined,
): string | undefined {
  const amountInputBN = toTokenMinimalUnit(amount, decimals ?? 0);
  if (rawBalanceBN.cmp(amountInputBN) === -1) {
    return strings('send.insufficient_funds');
  }
  return undefined;
}

export function validatePositiveNumericString(
  value: string,
): string | undefined {
  if (!isValidPositiveNumericString(value)) {
    return strings('send.invalid_value');
  }
  return undefined;
}

export function mapSnapErrorCodeIntoTranslation(errorCode: string): string {
  switch (errorCode) {
    case 'InsufficientBalance':
      return strings('send.insufficient_funds');
    case 'InsufficientBalanceToCoverFee':
      return strings('send.insufficient_balance_to_cover_fee');
    case 'Invalid':
    default:
      return strings('send.invalid_value');
  }
}

import { useCallback, useEffect, useRef, useState } from 'react';
import Engine from '../../../../core/Engine';
import { strings } from '../../../../../locales/i18n';

export const MONEY_REFERRAL_CODE_DEBOUNCE_MS = 1000;
export const MONEY_REFERRAL_CODE_MIN_LENGTH = 3;
export const MONEY_REFERRAL_CODE_MAX_LENGTH = 24;
/** Validation itself failed, as opposed to the code being rejected. */
export const MONEY_REFERRAL_CODE_UNKNOWN_ERROR = 'Unknown error';

/** Money codes are alphanumeric only — the points program's hyphen is not accepted. */
const MONEY_REFERRAL_CODE_PATTERN = /^[A-Z0-9]+$/;

/** The form the API expects, and the only form this hook reports or sends. */
export const normalizeMoneyReferralCode = (code: string) =>
  code.trim().toUpperCase();

const isReferralCodeFormatValid = (code: string) =>
  code.length >= MONEY_REFERRAL_CODE_MIN_LENGTH &&
  code.length <= MONEY_REFERRAL_CODE_MAX_LENGTH &&
  MONEY_REFERRAL_CODE_PATTERN.test(code);

export interface UseValidateMoneyReferralCodeResult {
  /**
   * Current referral code value, normalized
   */
  referralCode: string;
  /**
   * Function to update the referral code and trigger validation
   */
  setReferralCode: (code: string) => void;
  /**
   * Function to validate a referral code without setting it. Resolves to an
   * empty string when the code is valid, otherwise to the error to show.
   */
  validateCode: (code: string) => Promise<string>;
  /**
   * Whether validation is currently in progress
   */
  isValidating: boolean;
  /**
   * Whether the current referral code is valid
   */
  isValid: boolean;
  /**
   * Whether an unknown error occurred while validating the referral code
   */
  isUnknownError: boolean;
}

/**
 * Validates Rewards Money referral codes.
 *
 * Debounces backend validation for codes that pass the server's format
 * constraints: 3-24 uppercase letters or digits. Stale responses from older
 * requests are discarded. The Money API answers with `{ success }` and has no
 * VIP notion, so there is no VIP flag here.
 *
 * @param initialValue - Initial referral code value (default: '')
 * @param debounceMs - Debounce delay in milliseconds
 * @returns validation state and methods
 */
export const useValidateMoneyReferralCode = (
  initialValue: string = '',
  debounceMs: number = MONEY_REFERRAL_CODE_DEBOUNCE_MS,
): UseValidateMoneyReferralCodeResult => {
  const initialReferralCode = normalizeMoneyReferralCode(initialValue);
  const [referralCode, setReferralCodeState] = useState(initialReferralCode);
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(
    isReferralCodeFormatValid(initialReferralCode),
  );
  const hasInitialized = useRef(false);
  const requestIdRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDebounceTimer = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const validateCode = useCallback(async (code: string): Promise<string> => {
    const refinedCode = normalizeMoneyReferralCode(code);

    if (!isReferralCodeFormatValid(refinedCode)) {
      return strings('rewards.error_messages.invalid_referral_code');
    }

    try {
      const result = await Engine.controllerMessenger.call(
        'RewardsMoneyController:validateReferralCode',
        refinedCode,
      );
      if (!result.success) {
        return strings('rewards.error_messages.invalid_referral_code');
      }
      return '';
    } catch {
      return MONEY_REFERRAL_CODE_UNKNOWN_ERROR;
    }
  }, []);

  const triggerValidation = useCallback(
    (code: string) => {
      requestIdRef.current += 1;
      const currentRequestId = requestIdRef.current;

      clearDebounceTimer();
      setError('');
      setIsValidating(true);

      debounceTimerRef.current = setTimeout(async () => {
        const refinedCode = normalizeMoneyReferralCode(code);

        if (!isReferralCodeFormatValid(refinedCode)) {
          if (currentRequestId !== requestIdRef.current) return;
          setError(strings('rewards.error_messages.invalid_referral_code'));
          setIsValidating(false);
          return;
        }

        try {
          const result = await Engine.controllerMessenger.call(
            'RewardsMoneyController:validateReferralCode',
            refinedCode,
          );

          if (currentRequestId !== requestIdRef.current) return;

          setError(
            result.success
              ? ''
              : strings('rewards.error_messages.invalid_referral_code'),
          );
        } catch {
          if (currentRequestId !== requestIdRef.current) return;
          setError(MONEY_REFERRAL_CODE_UNKNOWN_ERROR);
        }

        setIsValidating(false);
      }, debounceMs);
    },
    [clearDebounceTimer, debounceMs],
  );

  const setReferralCode = useCallback(
    (code: string) => {
      const refinedCode = normalizeMoneyReferralCode(code);
      setReferralCodeState(refinedCode);

      if (refinedCode.length < MONEY_REFERRAL_CODE_MIN_LENGTH) {
        requestIdRef.current += 1;
        clearDebounceTimer();
        setIsValidating(false);
        setError('');
        return;
      }

      if (!isReferralCodeFormatValid(refinedCode)) {
        requestIdRef.current += 1;
        clearDebounceTimer();
        setIsValidating(false);
        setError(strings('rewards.error_messages.invalid_referral_code'));
        return;
      }

      triggerValidation(refinedCode);
    },
    [clearDebounceTimer, triggerValidation],
  );

  useEffect(() => {
    if (!hasInitialized.current) {
      setReferralCode(initialValue);
      hasInitialized.current = true;
    } else if (initialValue !== referralCode) {
      setReferralCode(initialValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue]);

  useEffect(
    () => () => {
      requestIdRef.current += 1;
      clearDebounceTimer();
    },
    [clearDebounceTimer],
  );

  const isValid =
    isReferralCodeFormatValid(referralCode) && !error && !isValidating;
  const isUnknownError = error === MONEY_REFERRAL_CODE_UNKNOWN_ERROR;

  return {
    referralCode,
    setReferralCode,
    validateCode,
    isValidating,
    isValid,
    isUnknownError,
  };
};

export default useValidateMoneyReferralCode;

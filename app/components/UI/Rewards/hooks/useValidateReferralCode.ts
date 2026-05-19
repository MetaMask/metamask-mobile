import { useState, useCallback, useEffect, useRef } from 'react';
import Engine from '../../../../core/Engine';
import { strings } from '../../../../../locales/i18n';

export const REFERRAL_CODE_DEBOUNCE_MS = 1000;
export const REFERRAL_CODE_MIN_LENGTH = 3;
export const REFERRAL_CODE_MAX_LENGTH = 12;
const REFERRAL_CODE_UNKNOWN_ERROR = 'Unknown error';
const REFERRAL_CODE_PATTERN = /^[A-Z0-9-]+$/;

const normalizeReferralCode = (code: string) => code.trim().toUpperCase();
const isReferralCodeFormatValid = (code: string) =>
  code.length >= REFERRAL_CODE_MIN_LENGTH &&
  code.length <= REFERRAL_CODE_MAX_LENGTH &&
  REFERRAL_CODE_PATTERN.test(code);

export interface UseValidateReferralCodeResult {
  /**
   * Current referral code value
   */
  referralCode: string;
  /**
   * Function to update the referral code and trigger validation
   */
  setReferralCode: (code: string) => void;
  /**
   * Function to validate a referral code without setting it
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
 * Custom hook for validating referral codes.
 * Debounces backend validation for referral codes that pass the backend format
 * constraints: 3-12 uppercase letters, numbers, or hyphens. Stale responses
 * from older requests are automatically discarded.
 *
 * @param initialValue - Initial referral code value (default: '')
 * @param debounceMs - Debounce delay in milliseconds
 * @returns UseValidateReferralCodeResult object with validation state and methods
 */
export const useValidateReferralCode = (
  initialValue: string = '',
  debounceMs: number = REFERRAL_CODE_DEBOUNCE_MS,
): UseValidateReferralCodeResult => {
  const initialReferralCode = normalizeReferralCode(initialValue);
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
    const refinedCode = normalizeReferralCode(code);

    if (!isReferralCodeFormatValid(refinedCode)) {
      return strings('rewards.error_messages.invalid_referral_code');
    }

    try {
      const valid = await Engine.controllerMessenger.call(
        'RewardsController:validateReferralCode',
        refinedCode,
      );
      if (!valid) {
        return strings('rewards.error_messages.invalid_referral_code');
      }
      return '';
    } catch {
      return REFERRAL_CODE_UNKNOWN_ERROR;
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
        const validationError = await validateCode(code);

        if (currentRequestId !== requestIdRef.current) return;

        setError(validationError);
        setIsValidating(false);
      }, debounceMs);
    },
    [clearDebounceTimer, debounceMs, validateCode],
  );

  const setReferralCode = useCallback(
    (code: string) => {
      const refinedCode = normalizeReferralCode(code);
      setReferralCodeState(refinedCode);

      if (refinedCode.length < 1) {
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
  const isUnknownError = error === REFERRAL_CODE_UNKNOWN_ERROR;

  return {
    referralCode,
    setReferralCode,
    validateCode,
    isValidating,
    isValid,
    isUnknownError,
  };
};

export default useValidateReferralCode;

import { useState, useCallback, useEffect, useRef } from 'react';
import Engine from '../../../../core/Engine';

const REFERRAL_CODE_LENGTH = 6;

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
 * Validates immediately when the code is exactly 6 Base32 characters.
 * Stale responses from older requests are automatically discarded.
 *
 * @param initialValue - Initial referral code value (default: '')
 * @returns UseValidateReferralCodeResult object with validation state and methods
 */
export const useValidateReferralCode = (
  initialValue: string = '',
): UseValidateReferralCodeResult => {
  const [referralCode, setReferralCodeState] = useState(initialValue);
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [unknownError, setUnknownError] = useState(false);
  const hasInitialized = useRef(false);
  const requestIdRef = useRef(0);

  const validateCode = useCallback(async (code: string): Promise<string> => {
    try {
      const valid = await Engine.controllerMessenger.call(
        'RewardsController:validateReferralCode',
        code,
      );
      if (!valid) {
        return String('rewards.error_messages.invalid_referral_code');
      }
      return '';
    } catch {
      return 'Unknown error';
    }
  }, []);

  const triggerValidation = useCallback(
    async (code: string) => {
      const currentRequestId = ++requestIdRef.current;

      setUnknownError(false);
      setError('');
      setIsValidating(true);

      const validationError = await validateCode(code);

      if (currentRequestId !== requestIdRef.current) return;

      if (validationError === 'Unknown error') {
        setUnknownError(true);
      }
      setError(validationError);
      setIsValidating(false);
    },
    [validateCode],
  );

  const setReferralCode = useCallback(
    (code: string) => {
      const refinedCode = code.trim().toUpperCase();
      setReferralCodeState(refinedCode);

      if (refinedCode.length !== REFERRAL_CODE_LENGTH) {
        ++requestIdRef.current;
        setIsValidating(false);
        setError(String('rewards.error_messages.invalid_referral_code'));
        return;
      }

      triggerValidation(refinedCode);
    },
    [triggerValidation],
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

  const isValid =
    referralCode.length === REFERRAL_CODE_LENGTH && !error && !isValidating;

  return {
    referralCode,
    setReferralCode,
    validateCode,
    isValidating,
    isValid,
    isUnknownError: unknownError,
  };
};

export default useValidateReferralCode;

import { useState, useCallback, useEffect } from 'react';
import { debounce } from 'lodash';
import Engine from '../../../../core/Engine';
import { handleRewardsErrorMessage } from '../utils';

export interface UseValidateReferralCodeResult {
  /**
   * Current referral code value
   */
  referralCode: string;
  /**
   * Current validation error message, empty string if no error
   */
  error: string;
  /**
   * Function to update the referral code and trigger validation
   */
  setReferralCode: (code: string) => void;
  /**
   * Function to validate a referral code without setting it
   */
  validateCode: (code: string) => Promise<string>;
  /**
   * Function to clear the current referral code and error
   */
  clearCode: () => void;
  /**
   * Whether validation is currently in progress (during debounce period)
   */
  isValidating: boolean;
}

/**
 * Custom hook for validating referral codes with debounced validation.
 * Validates 6-character base32 encoded strings following RFC 4648 standard.
 *
 * @param initialValue - Initial referral code value (default: '')
 * @param debounceMs - Debounce delay in milliseconds (default: 300)
 * @returns UseValidateReferralCodeResult object with validation state and methods
 */
export const useValidateReferralCode = (
  initialValue: string = '',
  debounceMs: number = 1000,
): UseValidateReferralCodeResult => {
  const [referralCode, setReferralCodeState] = useState(initialValue);
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const validateCode = useCallback(async (code: string): Promise<string> => {
    if (!code.trim()) {
      return '';
    }

    if (code.length !== 6) {
      return 'Invalid code';
    }

    // Base32 alphabet (RFC 4648): A-Z and 2-7
    const base32Regex = /^[A-Z2-7]{6}$/;
    if (!base32Regex.test(code.toUpperCase())) {
      return 'Invalid code';
    }

    try {
      const response = await Engine.controllerMessenger.call(
        'RewardsDataService:validateReferralCode',
        code,
      );
      if (!response.valid) {
        return 'Invalid code';
      }
    } catch (e) {
      return handleRewardsErrorMessage(e);
    }

    return '';
  }, []);

  // Debounced validation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedValidation = useCallback(
    debounce(async (code: string) => {
      const validationError = await validateCode(code);
      setError(validationError);
      setIsValidating(false);
    }, debounceMs),
    [debounceMs, validateCode],
  );

  // Function to update referral code and trigger validation
  const setReferralCode = useCallback(
    (code: string) => {
      setReferralCodeState(code);
      if (code.trim()) {
        setIsValidating(true);
      }
      debouncedValidation(code);
    },
    [debouncedValidation],
  );

  // Function to clear code and error
  const clearCode = useCallback(() => {
    setReferralCodeState('');
    setError('');
    setIsValidating(false);
    debouncedValidation.cancel();
  }, [debouncedValidation]);

  // Cleanup debounced function on unmount
  useEffect(() => () => debouncedValidation.cancel(), [debouncedValidation]);

  return {
    referralCode,
    error,
    setReferralCode,
    validateCode,
    clearCode,
    isValidating,
  };
};

export default useValidateReferralCode;

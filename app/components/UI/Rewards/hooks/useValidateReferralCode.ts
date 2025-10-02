import { useState, useCallback, useEffect } from 'react';
import { debounce } from 'lodash';
import Engine from '../../../../core/Engine';

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
   * Whether validation is currently in progress (during debounce period)
   */
  isValidating: boolean;
  /**
   * Whether the current referral code is valid
   */
  isValid: boolean;
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
    const valid = await Engine.controllerMessenger.call(
      'RewardsController:validateReferralCode',
      code,
    );
    if (!valid) {
      return 'Invalid code';
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

  // Cleanup debounced function on unmount
  useEffect(() => () => debouncedValidation.cancel(), [debouncedValidation]);

  const isValid = !!referralCode && !error && !isValidating;

  return {
    referralCode,
    setReferralCode,
    validateCode,
    isValidating,
    isValid,
  };
};

export default useValidateReferralCode;

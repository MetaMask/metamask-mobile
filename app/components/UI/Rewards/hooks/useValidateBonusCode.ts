import { useState, useCallback, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { strings } from '../../../../../locales/i18n';

export const BONUS_CODE_MIN_LENGTH = 4;
export const BONUS_CODE_MAX_LENGTH = 16;
export const BONUS_CODE_DEBOUNCE_MS = 500;

export interface UseValidateBonusCodeResult {
  /**
   * Current bonus code value
   */
  bonusCode: string;
  /**
   * Function to update the bonus code and trigger debounced validation
   * when 4-16 Base32 characters are entered.
   */
  setBonusCode: (code: string) => void;
  /**
   * Whether validation is currently in progress
   */
  isValidating: boolean;
  /**
   * Whether the current bonus code is valid
   */
  isValid: boolean;
  /**
   * Whether an unknown error occurred while validating the bonus code
   */
  isUnknownError: boolean;
  /**
   * Error message from validation
   */
  error: string;
}

/**
 * Custom hook for validating bonus codes.
 * Validates with debounce when the code is 4-16 Base32 characters.
 * Stale responses from older requests are automatically discarded.
 *
 * @returns UseValidateBonusCodeResult object with validation state and methods
 */
export const useValidateBonusCode = (): UseValidateBonusCodeResult => {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const [bonusCode, setBonusCodeState] = useState('');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [unknownError, setUnknownError] = useState(false);

  const requestIdRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    },
    [],
  );

  const validateCode = useCallback(
    async (code: string) => {
      if (!subscriptionId) {
        setIsValidating(false);
        setError('No subscription found. Please try again.');
        return;
      }

      const currentRequestId = ++requestIdRef.current;

      setError('');
      setUnknownError(false);
      setIsValidating(true);

      try {
        const valid = await Engine.controllerMessenger.call(
          'RewardsController:validateBonusCode',
          code,
          subscriptionId,
        );

        if (currentRequestId !== requestIdRef.current) return;

        if (!valid) {
          setError(strings('rewards.error_messages.invalid_bonus_code'));
        }
      } catch {
        if (currentRequestId !== requestIdRef.current) return;
        setUnknownError(true);
        setError('Unknown error');
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setIsValidating(false);
        }
      }
    },
    [subscriptionId],
  );

  const isValidLength = (len: number) =>
    len >= BONUS_CODE_MIN_LENGTH && len <= BONUS_CODE_MAX_LENGTH;

  const setBonusCode = useCallback(
    (code: string) => {
      const refinedCode = code.trim().toUpperCase();
      setBonusCodeState(refinedCode);
      setError('');
      setUnknownError(false);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      if (isValidLength(refinedCode.length)) {
        setIsValidating(true);
        debounceTimerRef.current = setTimeout(() => {
          validateCode(refinedCode);
        }, BONUS_CODE_DEBOUNCE_MS);
      } else {
        ++requestIdRef.current;
        setIsValidating(false);
      }
    },
    [validateCode],
  );

  const isValid = isValidLength(bonusCode.length) && !error && !isValidating;

  return {
    bonusCode,
    setBonusCode,
    isValidating,
    isValid,
    isUnknownError: unknownError,
    error,
  };
};

export default useValidateBonusCode;

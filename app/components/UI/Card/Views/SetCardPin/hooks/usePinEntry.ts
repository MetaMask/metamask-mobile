import { useCallback, useEffect, useRef, useState } from 'react';
import { Keys, type KeypadChangeData } from '../../../../../Base/Keypad';
import { PIN_LENGTH } from '../validatePin';
import { PIN_ERROR_RESET_DELAY_MS, PIN_UNMASK_DURATION_MS } from '../constants';

interface UsePinEntryOptions {
  disabled?: boolean;
}

export function usePinEntry({ disabled = false }: UsePinEntryOptions = {}) {
  const [value, setValue] = useState('');
  const [revealedIndex, setRevealedIndex] = useState<number | null>(null);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInputLocked, setIsInputLocked] = useState(false);

  const unmaskTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  const clearTimers = useCallback(() => {
    if (unmaskTimerRef.current) {
      clearTimeout(unmaskTimerRef.current);
      unmaskTimerRef.current = null;
    }
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const resetToEmpty = useCallback(() => {
    clearTimers();
    valueRef.current = '';
    setValue('');
    setRevealedIndex(null);
    setIsError(false);
    setErrorMessage(null);
    setIsInputLocked(false);
  }, [clearTimers]);

  const revealLastDigit = useCallback((nextLength: number) => {
    if (unmaskTimerRef.current) {
      clearTimeout(unmaskTimerRef.current);
    }
    setRevealedIndex(nextLength - 1);
    unmaskTimerRef.current = setTimeout(() => {
      setRevealedIndex(null);
      unmaskTimerRef.current = null;
    }, PIN_UNMASK_DURATION_MS);
  }, []);

  const appendDigit = useCallback(
    (digit: string) => {
      if (disabled || isInputLocked || valueRef.current.length >= PIN_LENGTH) {
        return;
      }
      setIsError(false);
      setErrorMessage(null);
      const next = `${valueRef.current}${digit}`;
      valueRef.current = next;
      setValue(next);
      revealLastDigit(next.length);
    },
    [disabled, isInputLocked, revealLastDigit],
  );

  const deleteDigit = useCallback(() => {
    if (disabled || isInputLocked || valueRef.current.length === 0) {
      return;
    }
    setIsError(false);
    setErrorMessage(null);
    if (unmaskTimerRef.current) {
      clearTimeout(unmaskTimerRef.current);
      unmaskTimerRef.current = null;
    }
    setRevealedIndex(null);
    const next = valueRef.current.slice(0, -1);
    valueRef.current = next;
    setValue(next);
  }, [disabled, isInputLocked]);

  const lockWithError = useCallback(
    (message: string) => {
      clearTimers();
      setIsError(true);
      setErrorMessage(message);
      setIsInputLocked(true);
      setRevealedIndex(null);
    },
    [clearTimers],
  );

  const triggerError = useCallback(
    (message: string, onAfterReset?: () => void) => {
      lockWithError(message);
      errorTimerRef.current = setTimeout(() => {
        valueRef.current = '';
        setValue('');
        setIsError(false);
        setErrorMessage(null);
        setIsInputLocked(false);
        setRevealedIndex(null);
        errorTimerRef.current = null;
        onAfterReset?.();
      }, PIN_ERROR_RESET_DELAY_MS);
    },
    [lockWithError],
  );

  const handleKeypadChange = useCallback(
    ({ pressedKey }: KeypadChangeData) => {
      if (disabled || isInputLocked) {
        return;
      }
      if (pressedKey === Keys.Back) {
        deleteDigit();
        return;
      }
      if (pressedKey === Keys.Initial) {
        resetToEmpty();
        return;
      }
      if (pressedKey === Keys.Period) {
        return;
      }
      appendDigit(pressedKey);
    },
    [disabled, isInputLocked, deleteDigit, resetToEmpty, appendDigit],
  );

  return {
    value,
    revealedIndex,
    isError,
    errorMessage,
    isInputLocked,
    handleKeypadChange,
    triggerError,
    lockWithError,
    resetToEmpty,
  };
}

import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
} from 'react';
import {
  formatPerpsInput,
  getPerpsFormattedInputSelection,
  normalizePerpsNumericInput,
  type PerpsInputSelection,
} from '../../../../utils/formatUtils';

interface UsePerpsProInputDisplayOptions {
  value: string;
  displayValue: string;
  locale: string;
  isFocused: boolean;
  isDisabled: boolean;
  onChangeText: (value: string) => void;
  inputLocaleRef: RefObject<string>;
  lastEmittedValueRef: RefObject<string>;
  selectionRef: RefObject<PerpsInputSelection | undefined>;
  shouldIgnoreNextSelectionChangeRef: RefObject<boolean>;
  setDisplayValue: Dispatch<SetStateAction<string>>;
  setSelection: Dispatch<SetStateAction<PerpsInputSelection | undefined>>;
}

type PerpsProInputChangeHandler = (nextValue: string) => void;

const syncPerpsProInputDisplay = ({
  value,
  displayValue,
  locale,
  isFocused,
  inputLocaleRef,
  lastEmittedValueRef,
  selectionRef,
  shouldIgnoreNextSelectionChangeRef,
  setDisplayValue,
  setSelection,
}: UsePerpsProInputDisplayOptions) => {
  if (!isFocused) {
    lastEmittedValueRef.current = value;
    const nextDisplayValue = formatPerpsInput(value, locale);

    if (nextDisplayValue !== displayValue) {
      setDisplayValue(nextDisplayValue);
    }
    return;
  }

  if (value === lastEmittedValueRef.current) {
    return;
  }

  const nextDisplayValue = formatPerpsInput(value, inputLocaleRef.current);
  const nextSelection = {
    start: nextDisplayValue.length,
    end: nextDisplayValue.length,
  };

  lastEmittedValueRef.current = value;
  selectionRef.current = nextSelection;
  shouldIgnoreNextSelectionChangeRef.current = true;
  setSelection(nextSelection);
  setDisplayValue(nextDisplayValue);
};

const usePerpsProInputDisplay = ({
  value,
  displayValue,
  locale,
  isFocused,
  isDisabled,
  onChangeText,
  inputLocaleRef,
  lastEmittedValueRef,
  selectionRef,
  shouldIgnoreNextSelectionChangeRef,
  setDisplayValue,
  setSelection,
}: UsePerpsProInputDisplayOptions): PerpsProInputChangeHandler => {
  useEffect(() => {
    syncPerpsProInputDisplay({
      value,
      displayValue,
      locale,
      isFocused,
      isDisabled,
      onChangeText,
      inputLocaleRef,
      lastEmittedValueRef,
      selectionRef,
      shouldIgnoreNextSelectionChangeRef,
      setDisplayValue,
      setSelection,
    });
  }, [
    displayValue,
    inputLocaleRef,
    isFocused,
    isDisabled,
    lastEmittedValueRef,
    locale,
    onChangeText,
    selectionRef,
    setDisplayValue,
    setSelection,
    shouldIgnoreNextSelectionChangeRef,
    value,
  ]);

  return useCallback(
    (nextValue: string) => {
      if (isDisabled) {
        return;
      }

      const canonicalValue = normalizePerpsNumericInput(
        nextValue,
        inputLocaleRef.current,
      );
      const nextDisplayValue = formatPerpsInput(
        canonicalValue,
        inputLocaleRef.current,
      );
      const nextSelection = getPerpsFormattedInputSelection({
        previousDisplayValue: displayValue,
        nextDisplayValue: nextValue,
        nextFormattedValue: nextDisplayValue,
        previousSelection: selectionRef.current,
        locale: inputLocaleRef.current,
      });

      setDisplayValue(nextDisplayValue);
      // This ref records the pending controlled value across the parent render.
      // eslint-disable-next-line react-compiler/react-compiler
      lastEmittedValueRef.current = canonicalValue;
      if (nextSelection) {
        selectionRef.current = nextSelection;
        setSelection(nextSelection);
        shouldIgnoreNextSelectionChangeRef.current = true;
      }
      onChangeText(canonicalValue);
    },
    [
      displayValue,
      inputLocaleRef,
      isDisabled,
      lastEmittedValueRef,
      onChangeText,
      selectionRef,
      setDisplayValue,
      setSelection,
      shouldIgnoreNextSelectionChangeRef,
    ],
  );
};

export default usePerpsProInputDisplay;

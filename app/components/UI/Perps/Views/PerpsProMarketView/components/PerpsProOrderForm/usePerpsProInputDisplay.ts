import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
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
  inputLocaleRef: RefObject<string>;
  lastEmittedValueRef: RefObject<string>;
  selectionRef: RefObject<PerpsInputSelection | undefined>;
  shouldIgnoreNextSelectionChangeRef: RefObject<boolean>;
  setDisplayValue: Dispatch<SetStateAction<string>>;
  setSelection: Dispatch<SetStateAction<PerpsInputSelection | undefined>>;
}

interface UpdatePerpsProInputDisplayOptions {
  nextValue: string;
  displayValue: string;
  onChangeText: (value: string) => void;
  inputLocaleRef: RefObject<string>;
  lastEmittedValueRef: RefObject<string>;
  selectionRef: RefObject<PerpsInputSelection | undefined>;
  shouldIgnoreNextSelectionChangeRef: RefObject<boolean>;
  setDisplayValue: Dispatch<SetStateAction<string>>;
  setSelection: Dispatch<SetStateAction<PerpsInputSelection | undefined>>;
}

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

/**
 * Applies a native text-change event to the localized display state.
 * Transient refs are updated here from the input event, never during render.
 */
export const updatePerpsProInputDisplay = ({
  nextValue,
  displayValue,
  onChangeText,
  inputLocaleRef,
  lastEmittedValueRef,
  selectionRef,
  shouldIgnoreNextSelectionChangeRef,
  setDisplayValue,
  setSelection,
}: UpdatePerpsProInputDisplayOptions) => {
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
  lastEmittedValueRef.current = canonicalValue;
  if (nextSelection) {
    selectionRef.current = nextSelection;
    setSelection(nextSelection);
    shouldIgnoreNextSelectionChangeRef.current = true;
  }
  onChangeText(canonicalValue);
};

const usePerpsProInputDisplay = ({
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
  useEffect(() => {
    syncPerpsProInputDisplay({
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
    });
  }, [
    displayValue,
    inputLocaleRef,
    isFocused,
    lastEmittedValueRef,
    locale,
    selectionRef,
    setDisplayValue,
    setSelection,
    shouldIgnoreNextSelectionChangeRef,
    value,
  ]);
};

export default usePerpsProInputDisplay;

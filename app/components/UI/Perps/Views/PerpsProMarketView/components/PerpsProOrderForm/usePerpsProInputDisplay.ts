import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useEffect,
} from 'react';
import {
  formatPerpsInput,
  type PerpsInputSelection,
} from '../../../../utils/formatUtils';

interface UsePerpsProInputDisplayOptions {
  value: string;
  locale: string;
  isFocused: boolean;
  inputLocaleRef: RefObject<string>;
  lastEmittedValueRef: RefObject<string>;
  selectionRef: RefObject<PerpsInputSelection | undefined>;
  shouldIgnoreNextSelectionChangeRef: RefObject<boolean>;
  setDisplayValue: Dispatch<SetStateAction<string>>;
  setSelection: Dispatch<SetStateAction<PerpsInputSelection | undefined>>;
}

const syncPerpsProInputDisplay = ({
  value,
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
    setDisplayValue(formatPerpsInput(value, locale));
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

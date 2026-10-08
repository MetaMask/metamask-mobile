import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  type TextInput,
  type TextInputSelectionChangeEvent,
} from 'react-native';
import { usePerpsLocale } from '../../../../hooks/usePerpsLocale';
import {
  formatPerpsInput,
  getPerpsFormattedInputSelection,
  normalizePerpsNumericInput,
  type PerpsInputSelection,
} from '../../../../utils/formatUtils';

interface SyncPerpsProInputDisplayOptions {
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

interface ApplyPerpsProInputDisplayChangeOptions {
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

interface UsePerpsProInputDisplayOptions {
  value: string;
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  isDisabled: boolean;
  inputRef?: RefObject<TextInput | null>;
  allowDisabledBlurCallbacks?: boolean;
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
}: SyncPerpsProInputDisplayOptions) => {
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
const applyPerpsProInputDisplayChange = ({
  nextValue,
  displayValue,
  onChangeText,
  inputLocaleRef,
  lastEmittedValueRef,
  selectionRef,
  shouldIgnoreNextSelectionChangeRef,
  setDisplayValue,
  setSelection,
}: ApplyPerpsProInputDisplayChangeOptions) => {
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
  onChangeText,
  onFocus,
  onBlur,
  isDisabled,
  inputRef: externalInputRef,
  allowDisabledBlurCallbacks = false,
}: UsePerpsProInputDisplayOptions) => {
  const locale = usePerpsLocale();
  const inputLocaleRef = useRef(locale);
  const internalInputRef = useRef<TextInput>(null);
  const inputRef = externalInputRef ?? internalInputRef;
  const selectionRef = useRef<PerpsInputSelection | undefined>(undefined);
  const lastEmittedValueRef = useRef(value);
  const shouldIgnoreNextSelectionChangeRef = useRef(false);
  const [isFocused, setIsFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState(() =>
    formatPerpsInput(value, locale),
  );
  const [selection, setSelection] = useState<PerpsInputSelection | undefined>(
    undefined,
  );

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

  const captureInputLocale = useCallback(() => {
    if (!isFocused) {
      inputLocaleRef.current = locale;
    }
  }, [isFocused, locale]);

  const handleChangeText = useCallback(
    (nextValue: string) => {
      if (isDisabled) {
        return;
      }

      applyPerpsProInputDisplayChange({
        nextValue,
        displayValue,
        onChangeText,
        inputLocaleRef,
        lastEmittedValueRef,
        selectionRef,
        shouldIgnoreNextSelectionChangeRef,
        setDisplayValue,
        setSelection,
      });
    },
    [displayValue, isDisabled, onChangeText],
  );

  const handleSelectionChange = useCallback(
    (event: TextInputSelectionChangeEvent) => {
      if (shouldIgnoreNextSelectionChangeRef.current) {
        shouldIgnoreNextSelectionChangeRef.current = false;
        return;
      }

      selectionRef.current = event.nativeEvent.selection;
      setSelection(event.nativeEvent.selection);
    },
    [],
  );

  const handleFocus = useCallback(() => {
    if (isDisabled) {
      return;
    }

    inputLocaleRef.current = locale;
    setIsFocused(true);
    onFocus?.();
  }, [isDisabled, locale, onFocus]);

  const handleBlur = useCallback(() => {
    const hasExternalValueUpdate = value !== lastEmittedValueRef.current;
    const canonicalValue = hasExternalValueUpdate
      ? value
      : normalizePerpsNumericInput(displayValue, inputLocaleRef.current);
    setIsFocused(false);
    selectionRef.current = undefined;
    shouldIgnoreNextSelectionChangeRef.current = false;
    setSelection(undefined);
    setDisplayValue(formatPerpsInput(canonicalValue, locale));

    if (!isDisabled || allowDisabledBlurCallbacks) {
      onBlur?.();

      if (!hasExternalValueUpdate && canonicalValue !== value) {
        onChangeText(canonicalValue);
      }
    }
  }, [
    allowDisabledBlurCallbacks,
    displayValue,
    isDisabled,
    locale,
    onBlur,
    onChangeText,
    value,
  ]);

  return {
    captureInputLocale,
    displayValue,
    inputProps: {
      isDisabled,
      onBlur: handleBlur,
      onChangeText: handleChangeText,
      onFocus: handleFocus,
      onSelectionChange: handleSelectionChange,
      selection,
      value: displayValue,
    },
    inputRef,
    isFocused,
    setIsFocused,
  };
};

export default usePerpsProInputDisplay;

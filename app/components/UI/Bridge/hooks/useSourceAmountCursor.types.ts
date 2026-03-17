import { type KeypadChangeData } from '../../../Base/Keypad';

export interface SourceAmountSelectionChangeEvent {
  nativeEvent: {
    selection: {
      start: number;
      end: number;
    };
  };
}

export interface UseSourceAmountCursorParams {
  sourceAmount?: string;
  sourceTokenDecimals?: number;
  maxInputLength: number;
  onSourceAmountChange: (value: string | undefined) => void;
}

export interface UseSourceAmountCursorResult {
  sourceSelection:
    | {
        start: number;
        end: number;
      }
    | undefined;
  handleSourceSelectionChange: (
    event: SourceAmountSelectionChangeEvent,
  ) => void;
  handleKeypadChange: ({ pressedKey, value }: KeypadChangeData) => void;
  resetSourceAmountCursorPosition: () => void;
}

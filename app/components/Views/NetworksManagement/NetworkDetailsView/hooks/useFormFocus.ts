import { useCallback, useRef, useState } from 'react';
import { TextInput } from 'react-native';
import type { FocusState } from '../NetworkDetailsView.types';

export interface UseFormFocusReturn {
  focus: FocusState;

  inputRpcURL: React.RefObject<TextInput>;
  inputNameRpcURL: React.RefObject<TextInput>;
  inputChainId: React.RefObject<TextInput>;
  inputSymbol: React.RefObject<TextInput>;
  inputBlockExplorerURL: React.RefObject<TextInput>;

  onNameFocused: () => void;
  onNameBlur: () => void;
  onSymbolFocused: () => void;
  onSymbolBlur: () => void;
  onRpcUrlFocused: () => void;
  onChainIdFocused: () => void;
  onChainIdBlur: () => void;

  jumpToRpcURL: () => void;
  jumpToChainId: () => void;
  jumpToSymbol: () => void;
  jumpBlockExplorerURL: () => void;
}

export const useFormFocus = (): UseFormFocusReturn => {
  const [focus, setFocus] = useState<FocusState>({
    isNameFieldFocused: false,
    isSymbolFieldFocused: false,
    isRpcUrlFieldFocused: false,
    isChainIdFieldFocused: false,
  });

  const inputRpcURL = useRef<TextInput>(null);
  const inputNameRpcURL = useRef<TextInput>(null);
  const inputChainId = useRef<TextInput>(null);
  const inputSymbol = useRef<TextInput>(null);
  const inputBlockExplorerURL = useRef<TextInput>(null);

  const onNameFocused = useCallback(
    () => setFocus((prev) => ({ ...prev, isNameFieldFocused: true })),
    [],
  );
  const onNameBlur = useCallback(
    () => setFocus((prev) => ({ ...prev, isNameFieldFocused: false })),
    [],
  );
  const onSymbolFocused = useCallback(
    () => setFocus((prev) => ({ ...prev, isSymbolFieldFocused: true })),
    [],
  );
  const onSymbolBlur = useCallback(
    () => setFocus((prev) => ({ ...prev, isSymbolFieldFocused: false })),
    [],
  );
  const onRpcUrlFocused = useCallback(
    () => setFocus((prev) => ({ ...prev, isRpcUrlFieldFocused: true })),
    [],
  );
  const onChainIdFocused = useCallback(
    () => setFocus((prev) => ({ ...prev, isChainIdFieldFocused: true })),
    [],
  );
  const onChainIdBlur = useCallback(
    () => setFocus((prev) => ({ ...prev, isChainIdFieldFocused: false })),
    [],
  );

  const jumpToRpcURL = useCallback(() => inputRpcURL.current?.focus(), []);
  const jumpToChainId = useCallback(() => inputChainId.current?.focus(), []);
  const jumpToSymbol = useCallback(() => inputSymbol.current?.focus(), []);
  const jumpBlockExplorerURL = useCallback(
    () => inputBlockExplorerURL.current?.focus(),
    [],
  );

  return {
    focus,
    inputRpcURL,
    inputNameRpcURL,
    inputChainId,
    inputSymbol,
    inputBlockExplorerURL,
    onNameFocused,
    onNameBlur,
    onSymbolFocused,
    onSymbolBlur,
    onRpcUrlFocused,
    onChainIdFocused,
    onChainIdBlur,
    jumpToRpcURL,
    jumpToChainId,
    jumpToSymbol,
    jumpBlockExplorerURL,
  };
};

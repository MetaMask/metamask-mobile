import { renderHook, act } from '@testing-library/react-native';
import { useFormFocus } from './useFormFocus';

describe('useFormFocus', () => {
  it('initializes with all focus states false', () => {
    const { result } = renderHook(() => useFormFocus());

    expect(result.current.focus).toEqual({
      isNameFieldFocused: false,
      isSymbolFieldFocused: false,
      isRpcUrlFieldFocused: false,
      isChainIdFieldFocused: false,
    });
  });

  it.each([
    ['name', 'onNameFocused', 'onNameBlur', 'isNameFieldFocused'],
    ['symbol', 'onSymbolFocused', 'onSymbolBlur', 'isSymbolFieldFocused'],
    ['chainId', 'onChainIdFocused', 'onChainIdBlur', 'isChainIdFieldFocused'],
  ] as const)(
    'toggles %s focus on focus/blur',
    (_field, focusFn, blurFn, stateKey) => {
      const { result } = renderHook(() => useFormFocus());

      act(() => (result.current[focusFn] as () => void)());
      expect(result.current.focus[stateKey]).toBe(true);

      act(() => (result.current[blurFn] as () => void)());
      expect(result.current.focus[stateKey]).toBe(false);
    },
  );

  it('sets rpc url focus on onRpcUrlFocused', () => {
    const { result } = renderHook(() => useFormFocus());

    act(() => result.current.onRpcUrlFocused());
    expect(result.current.focus.isRpcUrlFieldFocused).toBe(true);
  });

  it('creates refs for all input fields', () => {
    const { result } = renderHook(() => useFormFocus());

    expect(result.current.inputRpcURL).toBeDefined();
    expect(result.current.inputNameRpcURL).toBeDefined();
    expect(result.current.inputChainId).toBeDefined();
    expect(result.current.inputSymbol).toBeDefined();
    expect(result.current.inputBlockExplorerURL).toBeDefined();
  });

  it('jump functions do not throw when refs are null', () => {
    const { result } = renderHook(() => useFormFocus());

    expect(() => result.current.jumpToRpcURL()).not.toThrow();
    expect(() => result.current.jumpToChainId()).not.toThrow();
    expect(() => result.current.jumpToSymbol()).not.toThrow();
    expect(() => result.current.jumpBlockExplorerURL()).not.toThrow();
  });
});
